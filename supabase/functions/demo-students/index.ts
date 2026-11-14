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

    // One Memberstack member must not silently link to two different Auth
    // users. A conflicting identity fails closed and requires manual review.
    const { error: linkError } = await admin.from("member_identity_links").upsert({
      auth_user_id: caller.user.id,
      memberstack_member_id: memberId,
      verified_at: new Date().toISOString(),
      verified_source: "memberstack_oidc",
    }, { onConflict: "auth_user_id", ignoreDuplicates: true });
    assertDatabase(linkError, "identity_link_failed");
    const { data: link, error: checkLinkError } = await admin.from("member_identity_links")
      .select("memberstack_member_id").eq("auth_user_id", caller.user.id).single();
    assertDatabase(checkLinkError, "identity_link_unavailable");
    if (link?.memberstack_member_id !== memberId) {
      return response(req, 403, { error: "identity_mismatch" });
    }

    const { error: workspaceError } = await admin.from("workspaces").upsert({
      id: workspaceId, workspace_type: "family", display_name: "My Family",
    }, { onConflict: "id", ignoreDuplicates: true });
    assertDatabase(workspaceError, "workspace_create_failed");
    const { data: workspace, error: workspaceReadError } = await admin.from("workspaces")
      .select("workspace_type").eq("id", workspaceId).single();
    assertDatabase(workspaceReadError, "workspace_lookup_failed");
    if (workspace?.workspace_type !== "family") return response(req, 403, { error: "workspace_mismatch" });

    const { error: membershipError } = await admin.from("workspace_memberships").upsert({
      workspace_id: workspaceId, auth_user_id: caller.user.id,
      role: "family_owner", status: "active",
    }, { onConflict: "workspace_id,auth_user_id", ignoreDuplicates: true });
    assertDatabase(membershipError, "workspace_membership_failed");
    const { data: membership, error: memberReadError } = await admin.from("workspace_memberships")
      .select("role,status").eq("workspace_id", workspaceId)
      .eq("auth_user_id", caller.user.id).single();
    assertDatabase(memberReadError, "workspace_membership_unavailable");
    if (membership?.role !== "family_owner" || membership?.status !== "active") {
      return response(req, 403, { error: "workspace_access_denied" });
    }

    const { data: release, error: releaseError } = await admin.from("catalog_releases")
      .select("id").eq("school_year", year).order("revision", { ascending: false })
      .limit(1).single();
    assertDatabase(releaseError, "catalog_release_missing");
    const { error: yearInsertError } = await admin.from("workspace_year_plans").upsert({
      workspace_id: workspaceId, school_year: year, catalog_release_id: release!.id,
      plan_kind: "demo", state: "draft",
    }, { onConflict: "workspace_id,school_year,plan_kind", ignoreDuplicates: true });
    assertDatabase(yearInsertError, "year_plan_create_failed");
    const { data: yearPlan, error: yearReadError } = await admin.from("workspace_year_plans")
      .select("id").eq("workspace_id", workspaceId)
      .eq("school_year", year).eq("plan_kind", "demo").single();
    assertDatabase(yearReadError, "year_plan_missing");

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

    if (action === "add") {
      const name = cleanName(payload.displayName);
      const grade = cleanGrade(payload.gradeLevel);
      if (name === null || grade === undefined) return response(req, 400, { error: "invalid_student" });
      const { count, error: countError } = await admin.from("students")
        .select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId)
        .is("archived_at", null);
      assertDatabase(countError, "student_count_failed");
      if ((count ?? 0) >= 30) return response(req, 400, { error: "student_limit" });
      const { data: inserted, error: addError } = await admin.from("students")
        .insert({ workspace_id: workspaceId, display_name: name })
        .select("id").single();
      assertDatabase(addError, "student_add_failed");
      const { error: placementError } = await admin.from("student_year_placements").insert({
        workspace_id: workspaceId, year_plan_id: yearPlan!.id,
        student_id: inserted!.id, grade_level: grade, grade_label: gradeLabel(grade),
        enrollment_status: "active",
      });
      assertDatabase(placementError, "student_grade_save_failed");
    } else if (action === "update" || action === "archive") {
      const id = studentId(payload.studentId);
      if (!id) return response(req, 400, { error: "invalid_student" });
      const { data: existing, error: existingError } = await admin.from("students")
        .select("id").eq("id", id).eq("workspace_id", workspaceId)
        .is("archived_at", null).maybeSingle();
      assertDatabase(existingError, "student_lookup_failed");
      if (!existing) return response(req, 404, { error: "student_not_found" });

      if (action === "archive") {
        const { error: archiveError } = await admin.from("students")
          .update({ archived_at: new Date().toISOString() })
          .eq("id", id).eq("workspace_id", workspaceId).is("archived_at", null);
        assertDatabase(archiveError, "student_archive_failed");
        const { error: inactiveError } = await admin.from("student_year_placements")
          .update({ enrollment_status: "inactive" })
          .eq("year_plan_id", yearPlan!.id).eq("student_id", id)
          .eq("workspace_id", workspaceId);
        assertDatabase(inactiveError, "student_archive_placement_failed");
      } else {
        const name = cleanName(payload.displayName);
        const grade = cleanGrade(payload.gradeLevel);
        if (name === null || grade === undefined) return response(req, 400, { error: "invalid_student" });
        const { error: nameError } = await admin.from("students")
          .update({ display_name: name }).eq("id", id).eq("workspace_id", workspaceId);
        assertDatabase(nameError, "student_update_failed");
        const { error: placementError } = await admin.from("student_year_placements")
          .upsert({
            workspace_id: workspaceId, year_plan_id: yearPlan!.id,
            student_id: id, grade_level: grade, grade_label: gradeLabel(grade),
            enrollment_status: "active",
          }, { onConflict: "year_plan_id,student_id" });
        assertDatabase(placementError, "student_grade_update_failed");
      }
    }

    const { data: students, error: studentsError } = await admin.from("students")
      .select("id,display_name,created_at").eq("workspace_id", workspaceId)
      .is("archived_at", null).order("created_at", { ascending: true });
    assertDatabase(studentsError, "students_list_failed");
    const { data: placements, error: gradesError } = await admin.from("student_year_placements")
      .select("student_id,grade_level,enrollment_status")
      .eq("workspace_id", workspaceId).eq("year_plan_id", yearPlan!.id);
    assertDatabase(gradesError, "student_grades_list_failed");
    const byStudent = new Map((placements ?? []).map(p => [p.student_id, p]));
    return response(req, 200, {
      schoolYear: year, planKind: "demo",
      students: (students ?? []).map(student => ({
        id: student.id, displayName: student.display_name,
        gradeLevel: byStudent.get(student.id)?.grade_level ?? null,
      })),
    });
  } catch (error) {
    const stage = error instanceof Error ? error.message : "unexpected_error";
    logFailure(/^[a-z_]{4,70}$/.test(stage) ? stage : "unexpected_error");
    return response(req, 503, { error: "workspace_unavailable" });
  }
});
