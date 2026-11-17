// Private Demo Students API. No browser has direct database grants.
// Every request verifies the Supabase Auth identity AND the live current-year
// Memberstack Testing Plan through memberstack-plan-access.
// The membership response is not cached. Never use browser-supplied owner IDs.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";

const year = "2027-28";
const appId = "app_clbb9rspy00160ujl6tsxbsrj";
const origins = new Set([
  "https://plan.alveary.org",
  "https://kkeel.github.io",
  "http://localhost:3000",
]);

function response(req: Request, status: number, payload: object): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  const origin = req.headers.get("Origin");
  if (origin && origins.has(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type, x-client-info");
  }
  return new Response(JSON.stringify(payload), { status, headers });
}
function secretKey(): string | undefined {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;
  try { return JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}").default; }
  catch { return undefined; }
}
function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (!name || name.length > 60 || /[\u0000-\u001f\u007f]/.test(name)) return null;
  return name;
}
function cleanGrade(value: unknown): number | null | undefined {
  if (value === null || value === undefined) return null;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 12) return value;
  return undefined;
}
function gradeLabel(value: number | null): string | null {
  return value === null ? null : value === 0 ? "Kindergarten" : "Grade " + value;
}
function studentId(value: unknown): string | null {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value : null;
}
// A stable family workspace ID follows a verified Memberstack identity, not an
// easily-reset Supabase auth UID. RFC 9562 UUID v8 (SHA-256-based custom UUID).
async function familyWorkspaceId(memberId: string): Promise<string> {
  const data = new TextEncoder().encode("alveary:family:v1:" + appId + ":" + memberId);
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", data));
  const bytes = hash.slice(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x80;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, x => x.toString(16).padStart(2, "0")).join("");
  return h.slice(0, 8) + "-" + h.slice(8, 12) + "-" + h.slice(12, 16) +
    "-" + h.slice(16, 20) + "-" + h.slice(20);
}
function logFailure(stage: string) {
  // Do not log names, emails, student data, Memberstack IDs, or tokens.
  console.warn("demo-students:", stage);
}
function assertDatabase(error: unknown, stage: string): void {
  if (error) throw new Error(stage);
}

// Resolve a member ONLY from server-verified Supabase Auth + trusted identity.
// OIDC subjects and passwordless Memberstack handoff mappings converge on one
// canonical 24-character member ID, and therefore one family workspace.
async function trustedMemberIdentity(
  admin: ReturnType<typeof createClient>, authUserId: string
): Promise<{ memberId: string; handoff: boolean } | null> {
  const { data: account, error: accountError } =
    await admin.auth.admin.getUserById(authUserId);
  if (accountError || !account.user || account.user.is_anonymous) {
    throw new Error("identity_lookup_failed");
  }
  const oidc = (account.user.identities ?? []).filter(
    identity => identity.provider === "custom:memberstack"
  );
  if (oidc.length === 1) {
    const subject = oidc[0].identity_data?.sub;
    const match = typeof subject === "string"
      ? new RegExp("^([0-9a-f]{24})-" + appId + "$").exec(subject)
      : null;
    return match ? { memberId: match[1], handoff: false } : null;
  }
  if (oidc.length > 1) return null;
  // Supabase sets the real provider to 'email'. The Alveary-specific marker
  // must be backed by a service-role-only link for the exact auth user/email.
  if (account.user.app_metadata?.memberstack_app_id !== appId ||
      account.user.app_metadata?.provider !== "email" ||
      (account.user.identities ?? []).some(identity => identity.provider !== "email")) {
    return null;
  }
  const { data: mapping, error: mappingError } = await admin
    .from("memberstack_handoff_test_accounts")
    .select("member_id,login_email")
    .eq("auth_user_id", authUserId).maybeSingle();
  if (mappingError) throw new Error("handoff_mapping_lookup_failed");
  if (!mapping || mapping.login_email !== account.user.email ||
      typeof mapping.member_id !== "string" ||
      !/^[0-9a-f]{24}$/.test(mapping.member_id)) return null;
  return { memberId: mapping.member_id, handoff: true };
}

// Existing service-only planning RPCs require an identity-link row for the
// CURRENT auth_user_id. Insert once with correct provenance, verify its
// ownership, and deny rather than silently repairing a conflicting link.
async function ensureVerifiedHandoffLink(
  admin: ReturnType<typeof createClient>, authUserId: string, memberId: string
): Promise<void> {
  const { error: insertError } = await admin
    .from("member_identity_links")
    .upsert({
      auth_user_id: authUserId,
      memberstack_member_id: memberId,
      verified_at: new Date().toISOString(),
      verified_source: "memberstack_server",
    }, { onConflict: "auth_user_id", ignoreDuplicates: true });
  if (insertError) throw new Error("handoff_link_write_failed");
  const { data: linked, error: linkedError } = await admin
    .from("member_identity_links")
    .select("memberstack_member_id,verified_source")
    .eq("auth_user_id", authUserId).maybeSingle();
  if (linkedError || !linked || linked.memberstack_member_id !== memberId ||
      linked.verified_source !== "memberstack_server") {
    throw new Error("handoff_link_mismatch");
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("Origin");
    const headers = new Headers({
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
      "Vary": "Origin",
    });
    if (origin && origins.has(origin)) headers.set("Access-Control-Allow-Origin", origin);
    return new Response(null, { status: 204, headers });
  }
  if (req.method !== "POST") return response(req, 405, { error: "method_not_allowed" });
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer [A-Za-z0-9._-]+$/.test(authHeader) || authHeader.length > 9000) {
    return response(req, 401, { error: "sign_in_required" });
  }
  const url = Deno.env.get("SUPABASE_URL");
  const key = secretKey();
  if (!url || !key) return response(req, 503, { error: "workspace_unavailable" });

  try {
    const admin = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const jwt = authHeader.slice(7);
    const { data: caller, error: authError } = await admin.auth.getUser(jwt);
    if (authError || !caller.user || caller.user.is_anonymous) {
      return response(req, 401, { error: "sign_in_required" });
    }

    // The dedicated verifier checks Memberstack Custom OIDC + CURRENT ACTIVE
    // Testing Plan against the private year-specific mapping on each request.
    const entitlement = await fetch(url + "/functions/v1/memberstack-plan-access", {
      method: "POST",
      headers: {
        "Authorization": authHeader,
        "apikey": key,
        "Content-Type": "application/json",
      },
      body: "{}",
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(13000),
    });
    if (!entitlement.ok) return response(req, 403, { error: "demo_access_unavailable" });
    const granted: unknown = await entitlement.json();
    if (!granted || typeof granted !== "object" ||
        (granted as { access?: unknown; schoolYear?: unknown }).access !== "demo" ||
        (granted as { schoolYear?: unknown }).schoolYear !== year) {
      return response(req, 403, { error: "demo_access_required" });
    }

    // Supabase Auth identity and live Testing Plan were already verified.
    // Resolve the same canonical Memberstack family for either sign-in path.
    const identity = await trustedMemberIdentity(admin, caller.user.id);
    if (!identity) return response(req, 403, { error: "identity_unverified" });
    const memberId = identity.memberId;
    if (identity.handoff) {
      await ensureVerifiedHandoffLink(admin, caller.user.id, memberId);
    }
    const workspaceId = await familyWorkspaceId(memberId);

    let input: unknown;
    try { input = await req.json(); }
    catch { return response(req, 400, { error: "invalid_request" }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return response(req, 400, { error: "invalid_request" });
    }
    const payload = input as Record<string, unknown>;
    const action = payload.action;
    if (action !== "list" && action !== "add" && action !== "update" && action !== "archive") {
      return response(req, 400, { error: "unknown_action" });
    }
    const displayName = action === "add" || action === "update"
      ? cleanName(payload.displayName) : null;
    const gradeLevel = action === "add" || action === "update"
      ? cleanGrade(payload.gradeLevel) : null;
    const id = action === "update" || action === "archive"
      ? studentId(payload.studentId) : null;
    if (((action === "add" || action === "update") &&
      (displayName === null || gradeLevel === undefined)) ||
      ((action === "update" || action === "archive") && !id)) {
      return response(req, 400, { error: "invalid_student" });
    }

    // One roundtrip / one DB transaction: provision or reuse the trusted
    // workspace, apply any student edit, and return the current list.
    // Function is SECURITY INVOKER and EXECUTE is granted only to service_role.
    const { data: result, error: operationError } = await admin.rpc(
      "demo_students_apply", {
        p_auth_user_id: caller.user.id,
        p_member_id: memberId,
        p_workspace_id: workspaceId,
        p_school_year: year,
        p_action: action,
        p_student_id: id,
        p_display_name: displayName,
        p_grade_level: gradeLevel,
      }
    );
    assertDatabase(operationError, "student_operation_failed");
    if (!result || typeof result !== "object" || Array.isArray(result) ||
      (result as { schoolYear?: unknown }).schoolYear !== year ||
      (result as { planKind?: unknown }).planKind !== "demo" ||
      !Array.isArray((result as { students?: unknown }).students)) {
      throw new Error("student_response_unrecognized");
    }
    return response(req, 200, result as object);
  } catch (error) {
    const stage = error instanceof Error ? error.message : "unexpected_error";
    logFailure(/^[a-z_]{4,70}$/.test(stage) ? stage : "unexpected_error");
    return response(req, 503, { error: "workspace_unavailable" });
  }
});
