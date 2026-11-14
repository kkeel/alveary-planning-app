// Active-year Memberstack planning entitlement: fail closed.
// The caller's Supabase session was issued via Memberstack Custom OIDC.
// The verified OIDC subject is bound to the Memberstack member ID and app ID.
// Never trust user-provided email, member IDs, plan IDs, or client metadata.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const memberstackAppId = "app_clbb9rspy00160ujl6tsxbsrj";
const allowOrigins = new Set([
  "https://plan.alveary.org",
  "https://kkeel.github.io",
  "http://localhost:3000",
]);
const targetYear = "2027-28";
const targetPlanKind = "demo";

function headers(req: Request): Headers {
  const h = new Headers({ "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin" });
  const origin = req.headers.get("Origin");
  if (origin && allowOrigins.has(origin)) {
    h.set("Access-Control-Allow-Origin", origin);
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    h.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  }
  return h;
}
function reply(req: Request, code: number, access: "demo"|"none"|"unavailable",
  reason?: string): Response {
  return new Response(JSON.stringify({
    access, schoolYear: targetYear, ...(reason ? { reason } : {}),
  }), { status: code, headers: headers(req) });
}
function adminKey(): string | undefined {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try {
    return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default;
  } catch { return undefined; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(req) });
  if (req.method !== "POST") return reply(req, 405, "unavailable", "method_not_allowed");

  const bearer = req.headers.get("Authorization") ?? "";
  if (!bearer.startsWith("Bearer ") || bearer.length > 9000) return reply(req, 401, "none");
  const jwt = bearer.slice(7);
  if (jwt.split(".").length !== 3) return reply(req, 401, "none");

  const apiKey = Deno.env.get("MEMBERSTACK_LIVE_SECRET_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  const key = adminKey();
  if (!url || !key || !apiKey) return reply(req, 503, "unavailable", "verification_not_configured");

  try {
    const admin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
    // This check is required even when the Edge gateway's JWT check succeeds.
    const { data: auth, error: userError } = await admin.auth.getUser(jwt);
    if (userError || !auth.user || auth.user.is_anonymous) return reply(req, 401, "none");

    // Read trusted identities via Admin Auth; never use editable user_metadata.
    const { data: record, error: identityError } =
      await admin.auth.admin.getUserById(auth.user.id);
    if (identityError || !record.user) return reply(req, 503, "unavailable");
    const identities = (record.user.identities ?? []).filter(
      identity => identity.provider === "custom:memberstack");
    if (identities.length !== 1) return reply(req, 403, "none");

    const subject = identities[0].identity_data?.sub;
    if (typeof subject !== "string") return reply(req, 403, "none");
    // The existing verified OIDC subject is "<24-character-member-id>_<app-id>".
    // Require this exact binding: a different app's identity must not work here.
    const match = new RegExp("^([0-9a-f]{24})_" + memberstackAppId + "$").exec(subject);
    if (!match) return reply(req, 503, "unavailable", "identity_format_unrecognized");
    const memberId = match[1];

    // Determine grants from server-held mapping, not from the browser.
    const { data: rules, error: ruleError } = await admin
      .from("memberstack_plan_access_rules")
      .select("memberstack_plan_id")
      .eq("enabled", true)
      .eq("plan_kind", targetPlanKind)
      .eq("school_year", targetYear)
      .eq("workspace_type", "family")
      .eq("capability", "planning");
    if (ruleError) return reply(req, 503, "unavailable");
    if (!rules || rules.length === 0) return reply(req, 503, "unavailable", "plan_rules_not_enabled");

    // Fresh authoritative Memberstack lookup on every session check.
    // Fail closed for API, network or identity mismatches.
    const response = await fetch("https://admin.memberstack.com/members/" + encodeURIComponent(memberId), {
      method: "GET",
      headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
      signal: AbortSignal.timeout(9000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) return reply(req, 503, "unavailable", "member_lookup_failed");
    const body: unknown = await response.json();
    if (!body || typeof body !== "object" || !("data" in body)) {
      return reply(req, 503, "unavailable");
    }
    const profile = (body as { data?: unknown }).data;
    if (!profile || typeof profile !== "object") return reply(req, 503, "unavailable");
    const member = profile as { id?: unknown; planConnections?: unknown };
    if (member.id !== memberId || !Array.isArray(member.planConnections)) {
      return reply(req, 503, "unavailable", "member_identity_mismatch");
    }
    const planIds = new Set(rules.map(rule => rule.memberstack_plan_id));
    const eligible = member.planConnections.some((connection: unknown) => {
      if (!connection || typeof connection !== "object") return false;
      const plan = connection as { planId?: unknown; status?: unknown };
      return plan.status === "ACTIVE" && typeof plan.planId === "string" &&
        planIds.has(plan.planId);
    });
    return reply(req, 200, eligible ? "demo" : "none");
  } catch {
    return reply(req, 503, "unavailable", "verification_unavailable");
  }
});
