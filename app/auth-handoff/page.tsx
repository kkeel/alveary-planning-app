"use client";

// Isolated authentication proof route. NOT a replacement for normal login.
import { useCallback, useEffect, useState } from "react";
import { plannerSupabaseClient } from "../components/PlannerAuthProvider";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const HANDOFF_PATH = "/functions/v1/memberstack-handoff-proof";
const MEMBERSTACK_APP_ID = "app_clbb9rspy00160ujl6tsxbsrj";
const TEST_DASHBOARD = "https://alveary.org/alveary-2027-2028/dashboard-test";
const STORAGE_KEY = "alveary:handoff-proof:v1";
type Phase = "ready" | "checking-session" | "redirecting" | "redeeming" | "complete" | "error";

function base64url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function secret(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}
async function challenge(verifier: string): Promise<string> {
  return base64url(new Uint8Array(await crypto.subtle.digest(
    "SHA-256", new TextEncoder().encode(verifier)
  )));
}

export default function AuthHandoffProofPage() {
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState(
    "Development-only test: this checks whether a website login can create a real, refreshable Supabase Auth session."
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const code = fragment.get("code");
    const state = fragment.get("state");
    if (!code && !state) {
      // Restoring the existing test session is a first-class success state.
      // A previous successful exchange may have caused the normal auth shell
      // to rerender, so verify via Supabase rather than relying on transient UI.
      if (!plannerSupabaseClient) return;
      let active = true;
      setPhase("checking-session");
      void (async () => {
        const { data, error: getUserError } = await plannerSupabaseClient.auth.getUser();
        if (!active) return;
        const metadata = data.user?.app_metadata;
        if (!getUserError && data.user &&
            metadata?.memberstack_app_id === MEMBERSTACK_APP_ID &&
            metadata?.provider === "email") {
          setPhase("complete");
          setMessage("Your passwordless website handoff created a real Supabase Auth session, and Supabase verified that the session is still active. Reloading this page also restores it. Saved students and course data are intentionally NOT unlocked by this test.");
        } else {
          setPhase("ready");
        }
      })().catch(() => { if (active) setPhase("ready"); });
      return () => { active = false; };
    }
    // Remove one-use credentials from browser history before any async work.
    window.history.replaceState(window.history.state, "",
      window.location.pathname + window.location.search);
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (!SUPABASE_URL || !SUPABASE_KEY || !code || !state || !raw) {
      setPhase("error");
      setError("The test could not be resumed. Start again from this page.");
      return;
    }
    let verifier: string, expectedState: string;
    try {
      const saved = JSON.parse(raw) as { verifier?: unknown; state?: unknown; issued?: unknown };
      if (typeof saved.verifier !== "string" || typeof saved.state !== "string" ||
          saved.state !== state || typeof saved.issued !== "number" ||
          Date.now() - saved.issued > 120000) throw Error("invalid_test_state");
      verifier = saved.verifier;
      expectedState = saved.state;
    } catch {
      setPhase("error");
      setError("The handoff test expired or did not match this browser tab.");
      return;
    }
    let active = true;
    setPhase("redeeming");
    setMessage("Checking the one-time handoff…");
    void (async () => {
      try {
        const response = await fetch(SUPABASE_URL + HANDOFF_PATH, {
          method: "POST", mode: "cors", cache: "no-store", credentials: "omit",
          headers: { "Content-Type": "application/json", "apikey": SUPABASE_KEY },
          body: JSON.stringify({ action: "redeem", code, state: expectedState, verifier }),
        });
        const data: unknown = await response.json();
        if (!response.ok || !data || typeof data !== "object") throw Error("handoff_rejected");
        const token = (data as { access_token?: unknown }).access_token;
        const refresh = (data as { refresh_token?: unknown }).refresh_token;
        if (typeof token !== "string" || typeof refresh !== "string") throw Error("missing_session");
        // Reuse the same client as PlannerAuthProvider, never create a
        // competing GoTrueClient under the same browser storage key.
        if (!plannerSupabaseClient) throw Error("missing_auth_client");
        const result = await plannerSupabaseClient.auth.setSession({
          access_token: token, refresh_token: refresh,
        });
        if (result.error || !result.data.session) throw Error("session_restore_failed");
        const checked = await plannerSupabaseClient.auth.getUser();
        if (checked.error || !checked.data.user ||
            checked.data.user.app_metadata?.memberstack_app_id !== MEMBERSTACK_APP_ID ||
            checked.data.user.app_metadata?.provider !== "email") {
          throw Error("session_verify_failed");
        }
        if (!active) return;
        setPhase("complete");
        setMessage("Supabase Auth session established and verified. Refreshing this page should restore the session. This proof does NOT yet grant Demo planning access.");
      } catch {
        if (!active) return;
        setPhase("error");
        setError("Session handoff did not complete. Existing private planning permissions remain closed.");
      }
    })();
    return () => { active = false; };
  }, []);

  const begin = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY || phase !== "ready") return;
    setPhase("redirecting");
    setError(null);
    try {
      const verifier = secret();
      const state = secret();
      const pkce = await challenge(verifier);
      window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
        state, verifier, issued: Date.now(),
      }));
      const dashboard = new URL(TEST_DASHBOARD);
      dashboard.searchParams.set("alveary_handoff_state", state);
      dashboard.searchParams.set("alveary_handoff_challenge", pkce);
      window.location.assign(dashboard.toString());
    } catch {
      setPhase("error");
      setError("Could not start the test in this browser.");
    }
  }, [phase]);

  return (
    <main style={{ maxWidth: 720, margin: "2.5rem auto", padding: "1.25rem" }}>
      <p style={{ letterSpacing: ".08em", textTransform: "uppercase", fontSize: ".75rem" }}>
        Development authentication test
      </p>
      <h1>Alveary website → Planning App</h1>
      <p>{message}</p>
      {phase === "ready" && <>
        <p>Start this test in the same browser tab. You will return to the Alveary
          dashboard, where the next step currently requires one manual Console command.
          No Webflow edits are required.</p>
        <p>This proof uses a separate Supabase test account. It does not read or
          modify your existing students or course selections, but it may replace
          your local planner login in this browser.</p>
        <button type="button" onClick={() => void begin()}
          disabled={!SUPABASE_URL || !SUPABASE_KEY}>
          Start website handoff test
        </button>
      </>}
      {(phase === "checking-session" || phase === "redeeming" || phase === "redirecting") && <p role="status">
        Connecting securely…
      </p>}
      {phase === "complete" && <p role="status">
        The passwordless session test succeeded. It has no access to your
        saved planning data; linking it to the correct family workspace is a
        separate, security-reviewed implementation step.
      </p>}
      {error && <p role="alert">{error}</p>}
      <p style={{ fontSize: ".9rem", marginTop: "2rem" }}>
        This route is for development testing only. Your regular Planning App
        login and school-year access rules have not changed.
      </p>
    </main>
  );
}
