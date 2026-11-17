import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const auth = read("app/components/PlannerAuthProvider.tsx");
const page = read("app/auth-handoff/page.tsx");
const layout = read("app/layout.tsx");
const fn = read("supabase/functions/memberstack-handoff-proof/index.ts");
const docs = read("docs/webflow-dashboard-passwordless-handoff.md");

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
assert.ok(page.includes('phase === "website-needed"'),
  "No shared cookie: guide the user rather than causing a password prompt");
assert.ok(page.includes("Connect through my Alveary dashboard"));

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
assert.ok(!fn.includes('admin.auth.admin.createUser('),
  "Automatic pilot must not provision unreviewed synthetic email accounts");
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
