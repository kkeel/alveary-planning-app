// Private Demo Course Planning API. No browser has direct database grants.
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
  // Do not log names, emails, planning data, Memberstack IDs, or tokens.
  console.warn("demo-course-planning:", stage);
}
function assertDatabase(error: unknown, stage: string): void {
  if (error) throw new Error(stage);
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

    const { data: account, error: accountError } =
      await admin.auth.admin.getUserById(caller.user.id);
    assertDatabase(accountError, "identity_lookup_failed");
    const identities = (account.user?.identities ?? []).filter(
      identity => identity.provider === "custom:memberstack"
    );
    if (identities.length !== 1) return response(req, 403, { error: "identity_unverified" });
    const subject = identities[0].identity_data?.sub;
    if (typeof subject !== "string") return response(req, 403, { error: "identity_unverified" });
    const match = new RegExp("^([0-9a-f]{24})-" + appId + "$").exec(subject);
    if (!match) return response(req, 403, { error: "identity_unverified" });
    const memberId = match[1];
    const workspaceId = await familyWorkspaceId(memberId);


    let input: unknown;
    try { input = await req.json(); }
    catch { return response(req, 400, { error: "invalid_request" }); }
    if (!input || typeof input !== "object" || Array.isArray(input)) {
      return response(req, 400, { error: "invalid_request" });
    }
    const p = input as Record<string, unknown>;
    const manageActions = new Set([
      "batch_assign", "set_preference", "upsert_group", "delete_group",
    ]);
    const actions = new Set([
      "load", "import", "set_choice", "remove_choice", "set_stage",
      "set_topic", "set_course_student", "set_topic_student", ...manageActions,
    ]);
    if (typeof p.action !== "string" || !actions.has(p.action)) {
      return response(req, 400, { error: "invalid_action" });
    }
    const manage = manageActions.has(p.action);
    const courseId = typeof p.courseId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(p.courseId)
      ? p.courseId : null;
    const topicId = typeof p.topicId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(p.topicId)
      ? p.topicId : null;
    const student = studentId(p.studentId);
    const stage = p.stage === "idea" || p.stage === "planned" ? p.stage : null;
    const include = typeof p.include === "boolean" ? p.include : null;
    const assign = typeof p.assign === "boolean" ? p.assign : null;
    const studentIds = Array.isArray(p.studentIds) && p.studentIds.length <= 30 &&
      p.studentIds.every(x => studentId(x))
      ? [...new Set(p.studentIds)] : null;
    const groupId = studentId(p.groupId);
    const groupName = typeof p.groupName === "string" && p.groupName.trim().length > 0 &&
      p.groupName.trim().length <= 50 && !/[\u0000-\u001f\u007f]/.test(p.groupName)
      ? p.groupName.trim() : null;
    const priority = p.priority === null || p.priority === "" || p.priority === undefined
      ? null : typeof p.priority === "string" &&
        ["Core", "High Interest", "Additional"].includes(p.priority) ? p.priority : undefined;
    const arrangement = typeof p.arrangement === "string" &&
      ["Combined", "Separate", "Both", "Later"].includes(p.arrangement)
      ? p.arrangement : null;
    if (
      (p.action !== "load" && p.action !== "import" &&
        p.action !== "upsert_group" && p.action !== "delete_group" && !courseId) ||
      ((p.action === "set_topic" || p.action === "set_topic_student") && !topicId) ||
      ((p.action === "set_course_student" || p.action === "set_topic_student" ||
         p.action === "set_preference") && !student) ||
      ((p.action === "set_choice" || p.action === "set_stage") && !stage) ||
      (p.action === "set_topic" && include === null) ||
      ((p.action === "set_course_student" || p.action === "set_topic_student" ||
         p.action === "batch_assign") && assign === null) ||
      (p.action === "import" && (!Array.isArray(p.ideas) || p.ideas.length > 250)) ||
      (p.action === "batch_assign" && (!studentIds || studentIds.length === 0)) ||
      (p.action === "upsert_group" && (!groupName || !studentIds ||
         (p.groupId != null && !groupId))) ||
      (p.action === "delete_group" && !groupId) ||
      (p.action === "set_preference" && (priority === undefined || !arrangement))
    ) return response(req, 400, { error: "invalid_request" });

    // The trusted service_role client is used ONLY after JWT, Memberstack
    // identity and current membership entitlements were verified above.
    const { data: plan, error: planError } = manage
      ? await admin.rpc("demo_plan_manage", {
        p_auth_user_id: caller.user.id,
        p_member_id: memberId,
        p_workspace_id: workspaceId,
        p_school_year: year,
        p_action: p.action,
        p_course_id: courseId,
        p_student_ids: studentIds,
        p_student_id: student,
        p_assign: assign,
        p_priority: priority ?? null,
        p_arrangement: arrangement,
        p_group_id: groupId,
        p_group_name: groupName,
      })
      : await admin.rpc("demo_plan_apply", {
        p_auth_user_id: caller.user.id,
        p_member_id: memberId,
        p_workspace_id: workspaceId,
        p_school_year: year,
        p_action: p.action,
        p_course_id: courseId,
        p_stage: stage,
        p_topic_id: topicId,
        p_student_id: student,
        p_include: include,
        p_assign: assign,
        p_import: p.action === "import" ? p.ideas : null,
      });
    assertDatabase(planError, "plan_apply_failed");
    if (!plan || typeof plan !== "object" || Array.isArray(plan) ||
        (plan as { schoolYear?: unknown }).schoolYear !== year ||
        (plan as { planKind?: unknown }).planKind !== "demo" ||
        !Array.isArray((plan as { courses?: unknown }).courses) ||
        !Array.isArray((plan as { students?: unknown }).students)) {
      throw new Error("plan_response_unrecognized");
    }
    return response(req, 200, plan as object);
  } catch (error) {
    const stage = error instanceof Error ? error.message : "unexpected_error";
    logFailure(/^[a-z_]{4,70}$/.test(stage) ? stage : "unexpected_error");
    return response(req, 503, { error: "workspace_unavailable" });
  }
});
