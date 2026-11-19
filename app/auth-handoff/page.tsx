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
type Phase = "ready" | "checking-session" | "connecting" | "website-needed" |
  "redirecting" | "redeeming" | "complete" | "error";

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

// A signed Memberstack cookie shared with plan.alveary.org is the fastest
// option: no trip back to Webflow and no hosted password prompt. This is only
// a browser retrieval attempt; the Edge Function still verifies the signature,
// current ACTIVE plan and the one-time PKCE proof on the server.
async function sharedMemberstackToken(): Promise<string | null> {
  type CookieSdk = { getMemberCookie?: () => unknown };
  const memberstackWindow = window as Window & { $memberstackDom?: CookieSdk };
  for (let tries = 0; tries < 24; tries += 1) {
    const sdk = memberstackWindow.$memberstackDom;
    try {
      const token: unknown = sdk?.getMemberCookie?.();
      if (typeof token === "string" && token.split(".").length === 3) {
        return token;
      }
    } catch {
      // Treat initialization failures as missing login, not as proof of access.
    }
    await new Promise<void>(resolve => window.setTimeout(resolve, 250));
  }
  return null;
}

export default function AuthHandoffProofPage() {
  // Keep the automatic dashboard entry visually separate from the developer
  // diagnostic page. Null avoids briefly displaying developer copy on load.
  const [automaticMode, setAutomaticMode] = useState<boolean | null>(null);
  const [phase, setPhase] = useState<Phase>("ready");
  const [message, setMessage] = useState(
    "Development-only test: this checks whether a website login can create a real, refreshable Supabase Auth session."
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auto = new URLSearchParams(window.location.search).get("auto") === "1";
    setAutomaticMode(auto);
    const frameMode = new URLSearchParams(window.location.search).get("frame") === "1";
    // A short-lived, same-site child frame retains PKCE verifier and Auth
    // session in the planner origin. Webflow is the exact parent origin.
    if (frameMode && !window.location.hash) {
      let active = true;
      let settled = false;
      let ticker: ReturnType<typeof setInterval> | null = null;
      const parentOrigin = "https://alveary.org";
      if (window.parent === window) {
        setPhase("error");
        setError("Start the secure connection from the Alveary dashboard.");
        return;
      }
      const verifier = secret();
      const state = secret();
      const onMessage = (event: MessageEvent) => {
        if (!active || settled || event.source !== window.parent ||
            event.origin !== parentOrigin) return;
        const payload: unknown = event.data;
        if (!payload || typeof payload !== "object") return;
        const data = payload as { type?: unknown; state?: unknown; code?: unknown };
        if (data.type !== "alveary:planner:code" || data.state !== state ||
            typeof data.code !== "string" ||
            !/^[A-Za-z0-9_-]{43}$/.test(data.code)) return;
        settled = true;
        if (ticker) clearInterval(ticker);
        window.removeEventListener("message", onMessage);
        window.location.replace(
          "/auth-handoff/?auto=1&frame=1#code=" + encodeURIComponent(data.code) +
          "&state=" + encodeURIComponent(state)
        );
      };
      window.addEventListener("message", onMessage);
      setPhase("connecting");
      setMessage("Gathering your planner…");
      void (async () => {
        try {
          if (plannerSupabaseClient) {
            const current = await plannerSupabaseClient.auth.getUser();
            if (!active) return;
            if (!current.error && current.data.user && !current.data.user.is_anonymous) {
              settled = true;
              window.parent.postMessage({ type: "alveary:planner:complete" }, parentOrigin);
              return;
            }
          }
          const pkce = await challenge(verifier);
          if (!active) return;
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            state, verifier, issued: Date.now(),
          }));
          const ready = () => {
            if (!active || settled) return;
            window.parent.postMessage({
              type: "alveary:planner:ready", state, challenge: pkce,
            }, parentOrigin);
          };
          ready();
          ticker = setInterval(ready, 500);
          window.setTimeout(() => {
            if (!active || settled) return;
            settled = true;
            if (ticker) clearInterval(ticker);
            window.removeEventListener("message", onMessage);
            window.sessionStorage.removeItem(STORAGE_KEY);
            window.parent.postMessage({ type: "alveary:planner:failed" }, parentOrigin);
          }, 30000);
        } catch {
          if (!active) return;
          window.parent.postMessage({ type: "alveary:planner:failed" }, parentOrigin);
        }
      })();
      return () => {
        active = false;
        if (ticker) clearInterval(ticker);
        window.removeEventListener("message", onMessage);
      };
    }
    const fragment = new URLSearchParams(window.location.hash.slice(1));
    const code = fragment.get("code");
    const state = fragment.get("state");
    if (!code && !state) {
      if (!plannerSupabaseClient) return;
      const automatic = new URLSearchParams(window.location.search).get("auto") === "1";
      let active = true;
      setPhase("checking-session");
      void (async () => {
        const { data, error: getUserError } = await plannerSupabaseClient.auth.getUser();
        if (!active) return;
        // Reuse any genuine existing Supabase Auth session. Private data is
        // authorized separately by the unchanged current-year plan verifier.
        if (!getUserError && data.user && !data.user.is_anonymous) {
          if (automatic) {
            window.location.replace("/");
            return;
          }
          const metadata = data.user.app_metadata;
          if (metadata?.memberstack_app_id === MEMBERSTACK_APP_ID &&
              metadata?.provider === "email") {
            setPhase("complete");
            setMessage("Your passwordless website handoff created a real Supabase Auth session, and Supabase verified that it is still active after reload. Your school-year membership and family workspace are checked separately before you can open private planning pages.");
          } else {
            setPhase("ready");
          }
          return;
        }
        // Explicit page visits still keep the original development test flow.
        if (!automatic) {
          setPhase("ready");
          return;
        }

        setPhase("connecting");
        setMessage("Checking your existing Alveary login…");
        const memberJwt = await sharedMemberstackToken();
        if (!active) return;
        if (!memberJwt) {
          // Safari does not reliably share Memberstack cookies with the
          // planner. Kathryn's test-dashboard script can read the website's
          // own signed member JWT and complete the same PKCE-bound exchange.
          // Keep the secret verifier on this origin, never in the URL.
          const verifier = secret();
          const state = secret();
          const pkce = await challenge(verifier);
          if (!active) return;
          window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
            state, verifier, issued: Date.now(),
          }));
          const dashboard = new URL(TEST_DASHBOARD);
          dashboard.searchParams.set("alveary_handoff_state", state);
          dashboard.searchParams.set("alveary_handoff_challenge", pkce);
          setPhase("redirecting");
          setMessage("Connecting securely through your Alveary dashboard…");
          window.location.replace(dashboard.toString());
          return;
        }

        const verifier = secret();
        const nonce = secret();
        const pkce = await challenge(verifier);
        if (!active) return;
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify({
          state: nonce, verifier, issued: Date.now(),
        }));
        const response = await fetch(SUPABASE_URL + HANDOFF_PATH, {
          method: "POST", mode: "cors", cache: "no-store", credentials: "omit",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + memberJwt,
          },
          body: JSON.stringify({
            action: "issue", state: nonce, challenge: pkce,
          }),
        });
        const result: unknown = await response.json();
        if (!active) return;
        if (!response.ok || !result || typeof result !== "object" ||
            typeof (result as { code?: unknown }).code !== "string") {
          window.sessionStorage.removeItem(STORAGE_KEY);
          setPhase("error");
          setError(response.status === 403
            ? "We couldn't confirm an active 2027–28 Testing Plan for this login."
            : "The existing Alveary login could not be connected. Your private planning information remains protected.");
          return;
        }
        // The signed website JWT never enters a URL. The short-lived one-use
        // handoff code is bound to the private PKCE verifier in sessionStorage.
        window.location.replace(
          "/auth-handoff/?auto=1#code=" +
          encodeURIComponent((result as { code: string }).code) +
          "&state=" + encodeURIComponent(nonce)
        );
      })().catch(() => {
        if (!active) return;
        window.sessionStorage.removeItem(STORAGE_KEY);
        setPhase("error");
        setError("We couldn't connect to Alveary. Please try again.");
      });
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
        setMessage("Alveary confirmed your login and opened a persistent Planning App session. Your current-year membership will be checked separately.");
        if (new URLSearchParams(window.location.search).get("frame") === "1") {
          // The dashboard navigates in the SAME tab only after Supabase has
          // persisted the real planner session on the planner's own origin.
          window.parent.postMessage({
            type: "alveary:planner:complete",
          }, "https://alveary.org");
        } else if (new URLSearchParams(window.location.search).get("auto") === "1") {
          window.location.replace("/");
        }
      } catch {
        if (!active) return;
        setPhase("error");
        setError("Session handoff did not complete. Existing private planning permissions remain closed.");
      }
    })();
    return () => { active = false; };
  }, []);

  const begin = useCallback(async () => {
    if (!SUPABASE_URL || !SUPABASE_KEY || (phase !== "ready" && phase !== "website-needed")) return;
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

  // The automatic path may make two brief first-party navigation hops
  // (planner -> Alveary dashboard -> planner). Show a quiet, member-facing
  // transition, not technical authentication instructions.
  if (automaticMode !== false) {
    return (
      <main style={{
        maxWidth: 560, margin: "min(19vh, 10rem) auto",
        padding: "1.5rem", textAlign: "center"
      }}>
        <div aria-hidden="true" style={{
          marginBottom: "1.25rem", fontSize: "0.8rem",
          letterSpacing: "0.12em", textTransform: "uppercase"
        }}>Alveary</div>
        <h1 style={{ fontSize: "clamp(1.7rem, 4vw, 2.3rem)" }}>
          Opening your Planning App…
        </h1>
        <p role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
          {error ? "We couldn't finish connecting your account." :
            phase === "redirecting" ? "Verifying your Alveary sign-in…" :
            "Connecting securely to your family's planning workspace."}
        </p>
        {error && <div role="alert">
          <p>{error}</p>
          <p><a href={TEST_DASHBOARD}>Return to the Alveary testing dashboard</a></p>
          <button type="button" onClick={() => window.location.replace("/?connect=1")}>
            Try connecting again
          </button>
        </div>}
      </main>
    );
  }

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
        <p>This development test uses a separately verified Supabase session
          for your existing Alveary family workspace. Access to students and
          course selections always requires your active Testing Plan.</p>
        <button type="button" onClick={() => void begin()}
          disabled={!SUPABASE_URL || !SUPABASE_KEY}>
          Start website handoff test
        </button>
      </>}
      {(phase === "checking-session" || phase === "connecting" ||
        phase === "redeeming" || phase === "redirecting") && <p role="status">
        Connecting securely…
      </p>}
      {phase === "website-needed" && <div role="status">
        <p>To connect without another password on this device, we need to enable
          the secure handoff on the Alveary Webflow testing dashboard.</p>
        <p><a href={TEST_DASHBOARD}>Return to the Alveary testing dashboard</a></p>
        <button type="button" onClick={() => window.location.reload()}>
          Check for shared Alveary login again
        </button>
        <p>After the testing-dashboard handoff is enabled, you can use:</p>
        <button type="button" onClick={() => void begin()}>
          Connect through my Alveary dashboard
        </button>
      </div>}
      {phase === "complete" && <div role="status">
        <p>Your verified Supabase session is ready. The normal Planning App
          checks your active Demo membership and uses your verified Memberstack
          identity to find your existing family workspace.</p>
        <p><a href="/students/">Open my students and planning workspace</a></p>
        <p>If your current-year membership cannot be verified, these private
          pages will remain closed.</p>
      </div>}
      {error && <p role="alert">{error}</p>}
      <p style={{ fontSize: ".9rem", marginTop: "2rem" }}>
        This passwordless entry is in development. It works only for
        preapproved test accounts; school-year access rules are enforced
        separately for every private planning request.
      </p>
    </main>
  );
}
