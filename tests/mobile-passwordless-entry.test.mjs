import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const auth = read("app/components/PlannerAuthProvider.tsx");
const page = read("app/auth-handoff/page.tsx");
const layout = read("app/layout.tsx");
const fn = read("supabase/functions/memberstack-handoff-proof/index.ts");
const docs = read("docs/webflow-dashboard-passwordless-handoff.md");

const directClick = read("docs/webflow-dashboard-direct-click-handoff.md");
// New flow must keep PKCE verifier in the planner tab; the dashboard only
// receives public state/challenge and issues the existing 60s one-use code.
assert.ok(page.includes('get("bridge") === "1"'));
assert.ok(page.includes('window.opener'));
assert.ok(page.includes('event.source !== opener || event.origin !== origin'));
assert.ok(page.includes('type: "alveary:planner:ready"'));
assert.ok(page.includes('type !== "alveary:planner:code"'));
assert.ok(page.includes('window.sessionStorage.setItem(STORAGE_KEY'));
assert.ok(page.includes('const pkce = await challenge(verifier)'));
assert.ok(page.includes('window.location.replace('));
assert.ok(directClick.includes('window.open('));
assert.ok(directClick.includes('"auth-handoff/?auto=1&bridge=1"') ||
  directClick.includes('"/auth-handoff/?auto=1&bridge=1"'));
assert.ok(directClick.includes('event.origin !== PLANNER_ORIGIN'));
assert.ok(directClick.includes('authorizedWindows.has(event.source)'));
assert.ok(directClick.includes('action: "issue", state: payload.state, challenge: payload.challenge'));
assert.ok(directClick.includes('event.source.postMessage({'));
assert.ok(!directClick.includes('encodeURIComponent(token)'));
assert.ok(!directClick.includes('location.replace('));
assert.ok(directClick.includes('2026–27'));

const launchRules = read("supabase/migrations/20261119161000_register_2027_member_plans_disabled.sql");
const architecture = read("docs/memberstack-planner-auth-architecture.md");
// Three official 2027-28 plans must be registered fail-closed, with school
// access separate from family access. The pilot Testing Plan stays unchanged.
assert.ok(launchRules.includes("pln_alveary-membership-2027-2028-1a3g0ppr"));
assert.ok(launchRules.includes("pln_alveary-membership-2027-2028--hh6l0f3n"));
assert.ok(launchRules.includes("pln_alveary-school-license-2027-2028--kt6m0fpm"));
assert.match(launchRules, /school', 'planning', false/);
assert.match(launchRules, /family', 'planning', false/);
assert.ok(!launchRules.includes("update public.memberstack_plan_access_rules"));
assert.ok(!launchRules.includes("pln_testing-plan-vybk04zq"));
assert.ok(architecture.includes("Memberstack ID plus app ID"));
assert.ok(architecture.includes("without returning to the protected dashboard"));

// Dashboard link must no longer launch Memberstack-hosted OAuth immediately.
// The existing explicit signIn action remains as a manual fallback.
assert.ok(auth.includes('destination.searchParams.set("auto", "1")'));
assert.ok(auth.includes('window.location.replace(destination.toString())'));
assert.ok(auth.includes('memberEntryIntent() || fromAlvearyTestDashboard()'));
assert.ok(auth.includes('!isHandoffProofRoute()'));
assert.ok(auth.includes('client.auth.signInWithOAuth('));

// Both domains configure Memberstack to share the root-domain cookie.
assert.ok(layout.includes('useCookies: true, setCookieOnRootDomain: true'));
assert.ok(layout.includes('static.memberstack.com/scripts/v2/memberstack.js'));
assert.ok(layout.includes('data-memberstack-use-cookies=""'),
  "Planner Memberstack script must explicitly attempt the shared root cookie");

// No new secret is put in a URL. The server verifies the member JWT and the
// client retains a PKCE verifier in sessionStorage before one-use redemption.
assert.ok(page.includes("sharedMemberstackToken()"));
assert.ok(page.includes("getMemberCookie?.()"));
assert.ok(page.includes('action: "issue", state: nonce, challenge: pkce'));
assert.ok(page.includes('"Authorization": "Bearer " + memberJwt'));
assert.ok(page.includes('window.sessionStorage.setItem(STORAGE_KEY'));
assert.ok(page.includes('"/auth-handoff/?auto=1#code="'));
assert.ok(page.includes('window.history.replaceState('));
assert.ok(!page.includes('encodeURIComponent(memberJwt)'));
assert.ok(page.includes('plannerSupabaseClient.auth.setSession('));
assert.ok(page.includes('plannerSupabaseClient.auth.getUser()'));
assert.ok(page.includes('window.location.replace("/")'));
assert.ok(page.includes('const dashboard = new URL(TEST_DASHBOARD);'),
  "Safari fallback must target the explicitly approved Webflow test dashboard");
assert.ok(page.includes('dashboard.searchParams.set("alveary_handoff_state", state);'));
assert.ok(page.includes('dashboard.searchParams.set("alveary_handoff_challenge", pkce);'));
assert.ok(page.includes('window.location.replace(dashboard.toString());'),
  "Safari fallback must automatically launch the verified dashboard callback");
assert.ok(page.includes('window.sessionStorage.setItem(STORAGE_KEY'),
  "PKCE verifier stays on planning origin; never in callback URL");
assert.ok(!page.includes('window.location.assign(dashboard.toString());') ||
  page.includes('window.location.replace(dashboard.toString());'),
  "Normal dashboard entry must have an automatic same-tab fallback");
assert.ok(page.includes('phase === "website-needed"'),
  "Retain a manual recovery route if automatic linking fails");
assert.ok(page.includes("Connect through my Alveary dashboard"));
assert.ok(page.includes("const [automaticMode, setAutomaticMode] = useState<boolean | null>(null)"));
assert.ok(page.includes('setAutomaticMode(auto);'));
assert.ok(page.includes('if (automaticMode !== false) {'));
assert.ok(page.includes("Opening your Planning App…"),
  "Member entry should never briefly show the technical development test screen");
assert.ok(page.includes('href={TEST_DASHBOARD}'),
  "Automatic connection errors must give a safe route back to Alveary");
assert.ok(page.includes('window.location.replace("/?connect=1")'),
  "Connection retry must start from a fresh first-party entry");

// Even with a signed member token, the backend must authorize the exact
// active demo plan and issue an opaque, short-lived, replay-proof code.
assert.ok(fn.includes('"https://plan.alveary.org"'));
assert.ok(fn.includes('"https://alveary.org"'));
assert.ok(fn.includes('jwtVerify(token, JWKS'));
assert.ok(fn.includes('algorithms: ["RS256"]'));
assert.ok(fn.includes('await hasActiveDemo(memberId, admin)'));
assert.ok(fn.includes('plan.status === "ACTIVE"'));
assert.ok(fn.includes('await hashHex(code)'));
assert.ok(fn.includes('pkce_challenge: body.challenge'));
assert.ok(fn.includes('memberstack_consume_handoff'));
assert.ok(fn.includes('expires_at: new Date(Date.now() + 60000)'));
// New test accounts can be created ONLY behind an explicit off-by-default
// server setting, after live Memberstack verification and PKCE consumption.
const claims = read("supabase/migrations/20261119173000_memberstack_tester_provisioning_claims.sql");
assert.ok(fn.includes('Deno.env.get("MEMBERSTACK_TEST_AUTO_PROVISION_ENABLED") === "true"'),
  "First-time provisioning must be explicitly activated server-side");
assert.ok(fn.includes("admin.auth.admin.createUser("),
  "Eligible first-time testers need a backend-only account creation path");
assert.ok(fn.includes("const account = await getOrProvisionTestAccount(memberId, admin);"));
assert.ok(fn.indexOf("memberstack_consume_handoff") <
  fn.indexOf("const account = await getOrProvisionTestAccount"),
  "Account creation must follow atomic one-use handoff proof");
assert.ok(fn.includes("memberstack_tester_provisioning_claims"),
  "Concurrent first visits must not create multiple Auth users");
assert.ok(fn.includes('.from("member_identity_links")') &&
  fn.includes('legacy_identity_requires_review'),
  "Existing OIDC members must not silently receive duplicate Auth identities");
assert.ok(fn.includes('if (claimError.code === "23505")'),
  "Competing claimant must be refused, not provision a duplicate");
assert.ok(fn.includes('if (!testerProvisioningEnabled()) return null'),
  "Feature gate must be closed unless explicitly enabled");
assert.ok(fn.includes("@auth.alveary.invalid"),
  "Internal transport address must never be a user's Memberstack email");
assert.ok(fn.includes('memberstack_app_id: APP_ID'));
assert.ok(!fn.includes("memberstackEmail"));
assert.ok(claims.includes("member_id text primary key"));
assert.ok(claims.includes("enable row level security"));
assert.ok(claims.includes("revoke all on public.memberstack_tester_provisioning_claims"));
assert.ok(!claims.includes("security definer"));
assert.ok(!claims.includes("grant select, insert, update on public.memberstack_tester_provisioning_claims to authenticated"));
assert.ok(fn.includes('"handoff_pilot_not_enabled"'));
assert.ok(fn.includes('if (!account) return response(req, 403'));

// The website callback, if needed, is isolated to one dashboard page and
// never puts reusable Memberstack/Supabase JWTs in redirect URLs.
assert.ok(docs.includes("Before </body>"));
assert.ok(docs.includes('"/alveary-2027-2028/dashboard-test"'));
assert.ok(docs.includes('getMemberCookie?.()'));
assert.ok(docs.includes('Authorization'));
assert.ok(docs.includes('"/auth-handoff/?auto=1#code="') ||
  docs.includes('auth-handoff/?auto=1#code='));
assert.ok(!docs.includes('encodeURIComponent(token)'));
console.log("Mobile passwordless entry: shared-cookie fast path, one-use PKCE, scoped Webflow fallback and pilot-only access: OK");
