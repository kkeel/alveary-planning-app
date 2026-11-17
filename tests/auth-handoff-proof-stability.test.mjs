import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const page = read("app/auth-handoff/page.tsx");
const shell = read("app/components/AppShell.tsx");
const auth = read("app/components/PlannerAuthProvider.tsx");

// The isolated proof route cannot be unmounted by workspace userId changes,
// and must not offer access to any saved student/course state.
assert.ok(shell.includes('pathname.replace(/\\/$/, "") === "/auth-handoff"'),
  "Authentication proof must bypass keyed workspace providers");
assert.ok(shell.includes("return <>{children}</>;"),
  "Authentication proof should render without private workspace providers");

// Only ONE Supabase Auth client may own the app's persistent storage key.
assert.ok(auth.includes("export const plannerSupabaseClient = client;"),
  "The proof must share the normal Supabase Auth client");
assert.ok(page.includes('import { plannerSupabaseClient } from "../components/PlannerAuthProvider";'));
assert.ok(!page.includes("createClient("),
  "The proof must not create a competing GoTrueClient");

// A callback from the Webflow dashboard must never start the old hosted OIDC
// login on the proof route before redeeming the one-time handoff.
assert.ok(auth.includes("!isHandoffProofRoute()"),
  "Do not auto-start Memberstack OIDC on the handoff callback");

// A synthetically created test account is signed in but has NO Demo access.
assert.ok(auth.includes('session.user.app_metadata?.memberstack_app_id === "app_clbb9rspy00160ujl6tsxbsrj"'));
assert.ok(auth.includes('setPlanAccess("none");'));
assert.ok(page.includes('saved planning data'),
  "Proof must explicitly explain private data remain locked");

// The completion confirmation comes from getUser on the SAME Supabase client
// and trusted, server-issued app metadata, including after a page reload.
assert.ok(page.includes('plannerSupabaseClient.auth.getUser()'));
assert.ok(page.includes('metadata?.provider === "email"'));
assert.ok(page.includes('metadata?.memberstack_app_id === MEMBERSTACK_APP_ID'));
assert.ok(page.includes('setPhase("complete")'));
assert.ok(page.includes('checked.data.user.app_metadata?.provider !== "email"'));

// Never put a reusable bearer or refresh credential in a callback URL.
assert.ok(page.includes('window.history.replaceState('));
assert.ok(page.includes("fragment.get(\"code\")"));
assert.ok(!page.includes("location.hash ="));
console.log("Passwordless proof route: shared client, stable UI, no auto-SSO, fail-closed permissions: OK");
