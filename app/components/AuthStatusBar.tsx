"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const authClient: SupabaseClient | null =
  supabaseUrl && publishableKey
    ? createClient(supabaseUrl, publishableKey, {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
        },
      })
    : null;

// The public app remains browsable without ever starting SSO. A Webflow
// member-only entry link can use ?connect=1 to opt into seamless sign-in.
const ENTRY_QUERY = "connect";
const PENDING_KEY = "alveary:planner:oauth-pending";
const ALVEARY_LOGIN_URL = "https://alveary.org/login";

function hasMemberEntryIntent(): boolean {
  return (
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get(ENTRY_QUERY) === "1"
  );
}

function removeEntryIntent(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(ENTRY_QUERY)) return;
  url.searchParams.delete(ENTRY_QUERY);
  window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
}

// Capture only a short non-sensitive error code. Never show/copy URL fragments
// containing access or refresh tokens or the OAuth state/code.
function oauthErrorCode(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const code = query.get("error_code") ?? hash.get("error_code") ??
    query.get("error") ?? hash.get("error");
  if (!code) return null;
  return /^[a-z0-9_-]{1,80}$/i.test(code) ? code : "unknown_error";
}

export default function AuthStatusBar() {
  const [state, setState] = useState<"checking" | "public" | "signed-in">(
    authClient ? "checking" : "public",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startSignIn = useCallback(async () => {
    if (!authClient || typeof window === "undefined") return;
    setBusy(true);
    setError(null);
    removeEntryIntent(); // Avoid redirect loops and keep the original page URL.
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      const { data, error: beginError } = await authClient.auth.signInWithOAuth({
        provider: "custom:memberstack",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });
      if (beginError) throw beginError;
      if (!data.url) throw new Error("Missing OAuth authorization URL");
      // The marker lets us report a failed callback rather than silently
      // returning to Public view. No credentials or personal data are stored.
      window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
      window.location.assign(data.url); // Same tab; Memberstack is the IdP.
    } catch {
      window.sessionStorage.removeItem(PENDING_KEY);
      setError("We couldn't start Alveary sign-in. You can still browse the public pages.");
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!authClient) return;
    let active = true;

    const { data: listener } = authClient.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      if (session) {
        window.sessionStorage.removeItem(PENDING_KEY);
        setState("signed-in");
        setError(null);
      } else {
        setState("public");
      }
    });

    const initialize = async () => {
      try {
        // getSession awaits Supabase's OAuth callback processing, including
        // implicit/PCKE response handling when redirected back to the app.
        const { data, error: sessionError } = await authClient.auth.getSession();
        if (!active) return;

        const returnedError = oauthErrorCode();
        const pending = window.sessionStorage.getItem(PENDING_KEY);
        if (sessionError || returnedError) {
          setState("public");
          setError(returnedError
            ? `Alveary sign-in returned an error (${returnedError}). Please try again.`
            : "Supabase could not complete the sign-in callback. Please try again.");
          window.sessionStorage.removeItem(PENDING_KEY);
          removeEntryIntent();
          return;
        }

        if (data.session) {
          setState("signed-in");
          window.sessionStorage.removeItem(PENDING_KEY);
          removeEntryIntent();
          return;
        }

        setState("public");
        if (pending) {
          window.sessionStorage.removeItem(PENDING_KEY);
          setError("You returned from sign-in, but the Planning App did not receive a session. Check the Memberstack SSO integration and Supabase authentication logs.");
          removeEntryIntent();
          return;
        }

        // Only member-specific Webflow entry links opt into automatic SSO.
        // Public links never redirect visitors to a login page.
        if (hasMemberEntryIntent()) {
          await startSignIn();
        }
      } catch {
        if (!active) return;
        setState("public");
        setError("We couldn't check your Planning App session. Public pages remain available.");
        removeEntryIntent();
      }
    };

    void initialize();
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [startSignIn]);

  async function signOut() {
    if (!authClient) return;
    setBusy(true);
    setError(null);
    try {
      // TEMPORARY: planner-only sign-out. The required Alveary-wide
      // Memberstack + downstream SSO logout will be designed separately.
      const { error: signOutError } = await authClient.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      setState("public");
    } catch {
      setError("Couldn't sign out of the planner. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const signedIn = state === "signed-in";

  return (
    <div className="auth-bar">
      <div className="auth-bar-main" role="status" aria-live="polite">
        <span className="auth-status-tag">
          <span className={`auth-status-dot ${signedIn ? "is-signed-in" : ""}`} aria-hidden="true" />
          {state === "checking" ? "Checking sign-in" : signedIn ? "Signed in" : "Public view"}
        </span>
        <span className="auth-bar-note">
          {state === "checking"
            ? "Checking your planning account. You can continue browsing."
            : signedIn
              ? "Your planning account is connected. Membership features are not enabled yet."
              : authClient
                ? "Explore freely. Sign in to connect your Alveary planning account."
                : "Explore freely. Alveary sign-in is available; the planner connection is not enabled yet."}
        </span>
      </div>
      <div className="auth-bar-actions">
        {signedIn ? (
          <button type="button" onClick={signOut} disabled={busy}>
            {busy ? "Signing out…" : "Sign out (planner only)"}
          </button>
        ) : authClient ? (
          <button type="button" onClick={() => void startSignIn()} disabled={busy || state === "checking"}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        ) : (
          <a href={ALVEARY_LOGIN_URL} title="Sign in on the Alveary website (same tab)">Sign in</a>
        )}
      </div>
      {error && <p className="auth-bar-error" role="alert">{error}</p>}
    </div>
  );
}
