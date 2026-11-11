"use client";

import { useEffect, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// No credentials in source control. A real, verified session is required to
// display "Signed in"; the Webflow login cookie alone does not establish one.
const authClient: SupabaseClient | null =
  supabaseUrl && publishableKey
    ? createClient(supabaseUrl, publishableKey, {
        auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
      })
    : null;

const alvearyLoginUrl = "https://alveary.org/login";

export default function AuthStatusBar() {
  const [state, setState] = useState<"checking" | "public" | "signed-in">(
    authClient ? "checking" : "public",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authClient) return;
    let mounted = true;

    authClient.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      setState(error || !data.session ? "public" : "signed-in");
      if (error) setError("Couldn't check your planner sign-in. You can still browse public pages.");
    });

    const { data: listener } = authClient.auth.onAuthStateChange((_event, session) => {
      if (mounted) {
        setState(session ? "signed-in" : "public");
      }
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn() {
    if (!authClient) return;
    setError(null);
    setBusy(true);
    try {
      // Return to the exact page the member was browsing. This URL must be
      // added to Supabase Auth's redirect allow list during SSO setup.
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await authClient.auth.signInWithOAuth({
        provider: "custom:memberstack",
        options: { redirectTo },
      });
      if (error) throw error;
    } catch {
      setError("Sign-in couldn't start. Public browsing is still available.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    if (!authClient) return;
    setBusy(true);
    setError(null);
    try {
      // Sign out of this planner session only; do not silently sign members
      // out of their existing Alveary Webflow/Memberstack website account.
      const { error } = await authClient.auth.signOut({ scope: "local" });
      if (error) throw error;
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
            {busy ? "Signing out…" : "Sign out"}
          </button>
        ) : authClient ? (
          <button type="button" onClick={signIn} disabled={busy || state === "checking"}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        ) : (
          <a href={alvearyLoginUrl} title="Sign in on the Alveary website (same tab)">Sign in</a>
        )}
      </div>
      {error && <p className="auth-bar-error" role="alert">{error}</p>}
    </div>
  );
}
