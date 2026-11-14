"use client";

import { usePlannerAuth } from "./PlannerAuthProvider";

const ALVEARY_LOGIN_URL = "https://alveary.org/login";

export default function AuthStatusBar() {
  const { status, authenticated, planAccess, configured, busy, error, signIn, signOut } = usePlannerAuth();
  const demo = status === "signed-in";
  return <div className="auth-bar">
    <div className="auth-bar-main" role="status" aria-live="polite">
      <span className="auth-status-tag">
        <span className={`auth-status-dot ${demo ? "is-signed-in" : ""}`} aria-hidden="true" />
        {demo ? "Demo planning" : authenticated ? "Signed in · Public access" : "Public view"}
      </span>
      <span className="auth-bar-note">
        {demo
          ? "Your active Alveary Testing Plan has been verified for the Demo planning area."
          : authenticated && planAccess === "unavailable"
            ? "We couldn't verify your active school-year plan. Public browsing remains available."
            : authenticated
              ? "You're signed into Alveary, but no eligible Demo planning plan was confirmed."
              : configured
                ? "Explore Courses, Books and Supplies, or sign in with Alveary."
                : "Explore public lists. Sign in through the Alveary website."}
      </span>
    </div>
    <div className="auth-bar-actions">
      {authenticated ? <button type="button" onClick={() => void signOut()} disabled={busy}>
        {busy ? "Signing out…" : "Sign out (planner only)"}
      </button> : configured ? <button type="button" onClick={() => void signIn()} disabled={busy}>
        {busy ? "Connecting…" : "Sign in with Alveary"}
      </button> : <a href={ALVEARY_LOGIN_URL}>Sign in</a>}
    </div>
    {error && <p className="auth-bar-error" role="alert">{error}</p>}
  </div>;
}
