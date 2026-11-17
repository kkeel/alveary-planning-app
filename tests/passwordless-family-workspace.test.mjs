import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const plan = read("supabase/functions/memberstack-plan-access/index.ts");
const students = read("supabase/functions/demo-students/index.ts");
const courses = read("supabase/functions/demo-course-planning/index.ts");
const auth = read("app/components/PlannerAuthProvider.tsx");
const schema = read("supabase/migrations/20261117212500_multiple_verified_auth_identities_per_member.sql");

// One Memberstack family can have two independent Supabase Auth credentials;
// browser credentials must NEVER link or reassign families.
assert.ok(schema.includes("drop constraint member_identity_links_memberstack_member_id_key"));
assert.ok(schema.includes("create index if not exists member_identity_links_by_memberstack_member"));
assert.ok(!schema.includes("disable row level security"));
assert.ok(!schema.includes("grant ") && !schema.includes("GRANT "));

// Every protected Edge Function verifies the Supabase caller first and
// independently resolves the trusted member identity from admin-only state.
for (const [label, source] of [["plan access", plan], ["students", students], ["courses", courses]]) {
  assert.ok(source.includes("admin.auth.getUser(jwt)"), label + ": verify JWT against Supabase Auth");
  assert.ok(source.includes("admin.auth.admin.getUserById(authUserId)"), label + ": obtain trusted identity");
  assert.ok(source.includes('identity.provider === "custom:memberstack"'), label + ": retain original OIDC");
  assert.ok(source.includes('new RegExp("^([0-9a-f]{24})-" + '), label + ": bind OIDC subject to exact app");
  assert.ok(source.includes('account.user.app_metadata?.memberstack_app_id !=='), label + ": require server-only app marker");
  assert.ok(source.includes('account.user.app_metadata?.provider !== "email"'), label + ": require synthetic email provider");
  assert.ok(source.includes('.from("memberstack_handoff_test_accounts")'), label + ": service-only member binding");
  assert.ok(source.includes('.eq("auth_user_id", authUserId)'), label + ": bind mapping to actual session");
  assert.ok(source.includes("mapping.login_email !== account.user.email"), label + ": match synthetic login email");
  assert.ok(source.includes("trustedMemberIdentity(admin,"), label + ": invoke canonical trust check");
  assert.ok(!source.includes("req.json().memberId"), label + ": never trust browser identity");
}
assert.ok(plan.includes("memberstack_cached_demo_access") &&
  plan.includes('plan.status === "ACTIVE"') &&
  plan.includes(".eq(\"school_year\", targetYear)") &&
  plan.includes("positiveCacheTtlMs = 120_000"),
  "Membership verifier must retain current-year rules and short positive cache");

// Students and courses require current-year entitlement and the SAME stable
// workspace derivation, not the synthetic account's Supabase Auth UUID.
for (const [label, source] of [["students", students], ["courses", courses]]) {
  assert.ok(source.includes('"/functions/v1/memberstack-plan-access"'), label + ": independent server plan check");
  assert.ok(source.includes('const workspaceId = await familyWorkspaceId(memberId)'), label + ": one canonical family workspace");
  assert.ok(source.includes("if (identity.handoff)"), label + ": handoff account requires a trusted link");
  assert.ok(source.includes('verified_source: "memberstack_server"'), label + ": correct verified provenance");
  assert.ok(source.includes('linked.memberstack_member_id !== memberId'), label + ": mismatched link must fail");
  assert.ok(source.includes('linked.verified_source !== "memberstack_server"'), label + ": refuse alternate link provenance");
  assert.ok(source.includes('p_auth_user_id: caller.user.id'), label + ": maintain auth user mapping");
}
// Never open private planning just because a test session exists.
assert.ok(auth.includes('"/functions/v1/memberstack-plan-access"'));
assert.ok(!auth.includes('if (session.user.app_metadata?.memberstack_app_id'));
assert.ok(auth.includes('authenticated && planAccess === "demo" ? "signed-in" : "public"'));

console.log("Canonical passwordless family identity: strict Supabase+Memberstack trust, live plan and workspace isolation: OK");
