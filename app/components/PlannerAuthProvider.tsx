"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type AuthStatus = "checking" | "public" | "signed-in";
type PlannerAuthValue = {
  status: AuthStatus;
  userId: string | null;
  configured: boolean;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

// One browser client, shared by the status bar and the preview route controls.
// IMPORTANT: A Supabase session proves login only, NOT paid membership.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client: SupabaseClient | null = url && key
  ? createClient(url, key, { auth: {
      autoRefreshToken: true, persistSession: true, detectSessionInUrl: true,
    } })
  : null;
const ENTRY_QUERY = "connect";
const PENDING_KEY = "alveary:planner:oauth-pending";

function memberEntryIntent(): boolean {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get(ENTRY_QUERY) === "1";
}
function clearEntryIntent() {
  if (typeof window === "undefined") return;
  const current = new URL(window.location.href);
  if (!current.searchParams.has(ENTRY_QUERY)) return;
  current.searchParams.delete(ENTRY_QUERY);
  window.history.replaceState(window.history.state, "", current.pathname + current.search + current.hash);
}
function callbackError(): string | null {
  if (typeof window === "undefined") return null;
  const query = new URLSearchParams(window.location.search);
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const code = query.get("error_code") ?? fragment.get("error_code") ??
    query.get("error") ?? fragment.get("error");
  if (!code) return null;
  return /^[a-z0-9_-]{1,80}$/i.test(code) ? code : "unknown_error";
}

const AuthContext = createContext<PlannerAuthValue | null>(null);

export function PlannerAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(client ? "checking" : "public");
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const signIn = useCallback(async () => {
    if (!client || typeof window === "undefined") return;
    setBusy(true);
    setError(null);
    clearEntryIntent();
    try {
      const { data, error: startError } = await client.auth.signInWithOAuth({
        provider: "custom:memberstack",
        options: {
          redirectTo: window.location.origin + window.location.pathname,
          skipBrowserRedirect: true,
        },
      });
      if (startError) throw startError;
      if (!data.url) throw new Error("No provider URL");
      window.sessionStorage.setItem(PENDING_KEY, String(Date.now()));
      window.location.assign(data.url);
    } catch {
      window.sessionStorage.removeItem(PENDING_KEY);
      setError("We couldn't start Alveary sign-in. Public browsing is still available.");
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((event, session) => {
      if (!active || event === "INITIAL_SESSION") return;
      if (session?.user && !session.user.is_anonymous) {
        window.sessionStorage.removeItem(PENDING_KEY);
        setUserId(session.user.id);
        setStatus("signed-in");
        setError(null);
      } else {
        setUserId(null);
        setStatus("public");
      }
    });

    async function initialize() {
      try {
        const { data, error: sessionError } = await client!.auth.getSession();
        if (!active) return;
        const authError = callbackError();
        const pending = window.sessionStorage.getItem(PENDING_KEY);
        if (sessionError || authError) {
          setUserId(null);
          setStatus("public");
          setError(authError
            ? `Alveary sign-in returned an error (${authError}). Please try again.`
            : "Supabase could not finish sign-in. Please try again.");
          window.sessionStorage.removeItem(PENDING_KEY);
          clearEntryIntent();
          return;
        }
        if (data.session?.user && !data.session.user.is_anonymous) {
          setUserId(data.session.user.id);
          setStatus("signed-in");
          window.sessionStorage.removeItem(PENDING_KEY);
          clearEntryIntent();
          return;
        }
        setUserId(null);
        setStatus("public");
        if (pending) {
          window.sessionStorage.removeItem(PENDING_KEY);
          setError("The sign-in returned without a planner session. Please check the Memberstack SSO configuration.");
          clearEntryIntent();
        } else if (memberEntryIntent()) {
          await signIn();
        }
      } catch {
        if (!active) return;
        setUserId(null);
        setStatus("public");
        setError("We couldn't check the planner session. Public browsing remains available.");
        clearEntryIntent();
      }
    }
    void initialize();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [signIn]);

  const signOut = useCallback(async () => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      // Local preview-only sign-out. Memberstack global logout is separate.
      const { error: signOutError } = await client.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      setUserId(null);
      setStatus("public");
    } catch {
      setError("Couldn't sign out of the planner. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  return <AuthContext.Provider value={{ status, userId, configured: Boolean(client),
    busy, error, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function usePlannerAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("PlannerAuthProvider is missing");
  return context;
}
