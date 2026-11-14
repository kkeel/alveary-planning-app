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
  // Operational diagnostics only: never log member identifiers, emails, JWTs,
  // API response bodies or the secret key.
  if (code >= 500) console.warn("demo-plan-verifier:", reason ?? "unclassified");
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
    if (identityError || !record.user) return reply(req, 503, "unavailable", "identity_lookup_failed");
    const identities = (record.user.identities ?? []).filter(
      identity => identity.provider === "custom:memberstack");
    if (identities.length !== 1) return reply(req, 403, "none");

    const subject = identities[0].identity_data?.sub;
    if (typeof subject !== "string") return reply(req, 403, "none");
    // Verified Supabase OIDC subject is "<24-lowercase-hex-id>-<app-id>".
    // The OIDC sub is bound to this Memberstack app. Require the exact
    // app ID; never accept a browser-supplied member ID.
    const match = new RegExp("^([0-9a-f]{24})-" + memberstackAppId + "$").exec(subject);
    if (!match) return reply(req, 503, "unavailable", "identity_format_unrecognized");
    const internalId = match[1];
    const expectedMemberId = "mem_" + internalId;

    // Determine grants from server-held mapping, not from the browser.
    const { data: rules, error: ruleError } = await admin
      .from("memberstack_plan_access_rules")
      .select("memberstack_plan_id")
      .eq("enabled", true)
      .eq("plan_kind", targetPlanKind)
      .eq("school_year", targetYear)
      .eq("workspace_type", "family")
      .eq("capability", "planning");
    if (ruleError) return reply(req, 503, "unavailable", "rule_lookup_failed");
    if (!rules || rules.length === 0) return reply(req, 503, "unavailable", "plan_rules_not_enabled");

    // Memberstack member IDs are application-dependent: older members may
    // have a 24-character hex ID (as shown in Memberstack's dashboard), while
    // newer documentation uses mem_-prefixed examples. The trusted OIDC sub
    // for this app includes the exact dashboard ID. Query that ID first.
    // A 200 response with data:null is not a found member; fall back only
    // for genuinely missing profiles, and never on API/auth errors.
    async function lookup(candidate: string): Promise<Response> {
      return fetch("https://admin.memberstack.com/members/" + encodeURIComponent(candidate), {
        method: "GET",
        headers: { "X-API-KEY": apiKey, "Accept": "application/json" },
        signal: AbortSignal.timeout(9000),
        redirect: "error",
        cache: "no-store",
      });
    }
    async function verifiedLookup(candidate: string): Promise<"missing" | {
      id: string; planConnections: unknown[];
    }> {
      const response = await lookup(candidate);
      // Never retry 401, 403 or 5xx with an alternative identity.
      if (response.status === 404) return "missing";
      if (!response.ok) throw new Error("member_api_http_" + response.status);
      const body: unknown = await response.json();
      if (!body || typeof body !== "object" || !("data" in body)) {
        throw new Error("member_response_unrecognized");
      }
      const profile = (body as { data?: unknown }).data;
      // Memberstack can return HTTP 200 with data:null for an unknown member.
      if (profile === null || profile === undefined) return "missing";
      if (typeof profile !== "object" || Array.isArray(profile)) {
        throw new Error("member_response_unrecognized");
      }
      const member = profile as { id?: unknown; planConnections?: unknown };
      // Strictly bind the returned profile to the trusted OIDC identity.
      if (member.id !== internalId && member.id !== expectedMemberId) {
        throw new Error("member_identity_mismatch");
      }
      if (!Array.isArray(member.planConnections)) {
        throw new Error("member_plans_missing");
      }
      return { id: member.id, planConnections: member.planConnections };
    }
    let member = await verifiedLookup(internalId);
    if (member === "missing") member = await verifiedLookup(expectedMemberId);
    if (member === "missing") return reply(req, 503, "unavailable", "member_profile_missing");
    const planIds = new Set(rules.map(rule => rule.memberstack_plan_id));
    const eligible = member.planConnections.some((connection: unknown) => {
      if (!connection || typeof connection !== "object") return false;
      const plan = connection as { planId?: unknown; status?: unknown };
      return plan.status === "ACTIVE" && typeof plan.planId === "string" &&
        planIds.has(plan.planId);
    });
    return reply(req, 200, eligible ? "demo" : "none");
  } catch (error) {
    const stage = error instanceof Error && /^member_(api_http_[0-9]{3}|response_unrecognized|identity_mismatch|plans_missing)$/.test(error.message)
      ? error.message : "verification_unavailable";
    return reply(req, 503, "unavailable", stage);
  }
});
