"use client";

import { usePlannerAuth } from "./PlannerAuthProvider";
import MemberstackConnectionCheck from "./MemberstackConnectionCheck";

const ALVEARY_LOGIN_URL = "https://alveary.org/login";

export default function AuthStatusBar() {
  const { status, configured, busy, error, signIn, signOut } = usePlannerAuth();
  const signedIn = status === "signed-in";
  return <div className="auth-bar">
    <div className="auth-bar-main" role="status" aria-live="polite">
      <span className="auth-status-tag">
        <span className={`auth-status-dot ${signedIn ? "is-signed-in" : ""}`} aria-hidden="true" />
        {status === "checking" ? "Checking sign-in" : signedIn ? "Signed in" : "Public view"}
      </span>
      <span className="auth-bar-note">
        {status === "checking"
          ? "Checking your planning account."
          : signedIn
            ? "Planning preview connected. Membership permissions are still being built."
            : configured
              ? "Explore freely or sign in with your Alveary account."
              : "Explore freely. Sign in on the Alveary website."}
      </span>
    </div>
    <div className="auth-bar-actions">
      {signedIn ? <button type="button" onClick={() => void signOut()} disabled={busy}>
        {busy ? "Signing out…" : "Sign out (planner only)"}
      </button> : configured ? <button type="button" onClick={() => void signIn()} disabled={busy || status === "checking"}>
        {busy ? "Signing in…" : "Sign in"}
      </button> : <a href={ALVEARY_LOGIN_URL} title="Sign in on the Alveary website">Sign in</a>}
    </div>
    {error && <p className="auth-bar-error" role="alert">{error}</p>}
    <MemberstackConnectionCheck />
  </div>;
}
