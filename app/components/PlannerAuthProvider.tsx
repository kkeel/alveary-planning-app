"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { createClient, type Session, type SupabaseClient } from "@supabase/supabase-js";

type AuthStatus = "checking" | "public" | "signed-in";
type PlanAccess = "checking" | "demo" | "none" | "unavailable";
type PlannerAuthValue = {
  status: AuthStatus;
  userId: string | null;
  authenticated: boolean;
  planAccess: PlanAccess;
  configured: boolean;
  busy: boolean;
  error: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
};

// A Supabase session establishes Memberstack OIDC identity only. Planning mode
// additionally requires server-verified current-year Memberstack plan access.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const client: SupabaseClient | null = url && key
  ? createClient(url, key, {
      auth: { autoRefreshToken: true, persistSession: true, detectSessionInUrl: true },
    })
  : null;
const ENTRY_QUERY = "connect";
const PENDING_KEY = "alveary:planner:oauth-pending";

function memberEntryIntent(): boolean {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get(ENTRY_QUERY) === "1";
}
function fromAlvearyTestDashboard(): boolean {
  if (typeof document === "undefined" || !document.referrer) return false;
  try {
    const referrer = new URL(document.referrer);
    return referrer.protocol === "https:" &&
      (referrer.hostname === "alveary.org" || referrer.hostname === "www.alveary.org") &&
      /^\/alveary-2027-2028\/dashboard-test\/?$/.test(referrer.pathname);
  } catch { return false; }
}
function clearEntryIntent() {
  if (typeof window === "undefined") return;
  const current = new URL(window.location.href);
  if (!current.searchParams.has(ENTRY_QUERY)) return;
  current.searchParams.delete(ENTRY_QUERY);
  window.history.replaceState(window.history.state, "",
    current.pathname + current.search + current.hash);
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
  const [session, setSession] = useState<Session | null>(null);
  const [starting, setStarting] = useState(Boolean(client));
  const [planAccess, setPlanAccess] = useState<PlanAccess>("checking");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recheck, setRecheck] = useState(0);
  const signInStarted = useRef(false);

  const signIn = useCallback(async () => {
    if (!client || typeof window === "undefined" || signInStarted.current) return;
    signInStarted.current = true;
    setStarting(true);
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
      signInStarted.current = false;
      window.sessionStorage.removeItem(PENDING_KEY);
      setStarting(false);
      setError("We couldn't start Alveary sign-in. Public browsing is still available.");
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!client) return;
    let active = true;
    const { data: listener } = client.auth.onAuthStateChange((event, next) => {
      if (!active || event === "INITIAL_SESSION") return;
      // Do no network requests inside this callback. Supabase Auth holds its
      // own lock while notifying subscribers.
      setSession(next?.user && !next.user.is_anonymous ? next : null);
      setPlanAccess("checking");
      if (next?.user && !next.user.is_anonymous) {
        window.sessionStorage.removeItem(PENDING_KEY);
        setStarting(false);
        setError(null);
      }
    });

    async function initialize() {
      try {
        const { data, error: sessionError } = await client!.auth.getSession();
        if (!active) return;
        const authError = callbackError();
        const pending = window.sessionStorage.getItem(PENDING_KEY);
        if (sessionError || authError) {
          setSession(null);
          setPlanAccess("none");
          setStarting(false);
          setError(authError
            ? `Alveary sign-in returned an error (${authError}). Please try again.`
            : "Supabase could not finish sign-in. Please try again.");
          window.sessionStorage.removeItem(PENDING_KEY);
          clearEntryIntent();
          return;
        }
        if (data.session?.user && !data.session.user.is_anonymous) {
          setSession(data.session);
          setPlanAccess("checking");
          setStarting(false);
          window.sessionStorage.removeItem(PENDING_KEY);
          clearEntryIntent();
          return;
        }
        setSession(null);
        setPlanAccess("none");
        if (pending) {
          window.sessionStorage.removeItem(PENDING_KEY);
          setStarting(false);
          setError("Sign-in returned without a planning session. Please try Alveary SSO again.");
          clearEntryIntent();
        } else if (memberEntryIntent() || fromAlvearyTestDashboard()) {
          // Navigation intent is not membership authorization; start normal
          // OIDC exactly once, and verify the member's plan after redirect.
          await signIn();
        } else {
          setStarting(false);
        }
      } catch {
        if (!active) return;
        setSession(null);
        setStarting(false);
        setPlanAccess("none");
        setError("We couldn't check the planner session. Public browsing remains available.");
        clearEntryIntent();
      }
    }
    void initialize();
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [signIn]);

  // Recheck on return to the tab, so changes/revocations are picked up
  // without trusting cached browser-side plan information.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setRecheck(n => n + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  useEffect(() => {
    if (!session) {
      setPlanAccess("none");
      return;
    }
    let active = true;
    setPlanAccess("checking");
    async function checkActiveYear() {
      try {
        if (!url || !key) throw new Error("Not configured");
        const response = await fetch(url + "/functions/v1/memberstack-plan-access", {
          method: "POST",
          cache: "no-store",
          credentials: "omit",
          headers: {
            "Authorization": "Bearer " + session!.access_token,
            "apikey": key!,
            "Content-Type": "application/json",
          },
        });
        if (!active) return;
        if (!response.ok) {
          setPlanAccess(response.status === 401 || response.status === 403
            ? "none" : "unavailable");
          return;
        }
        const result: unknown = await response.json();
        const access = result && typeof result === "object" &&
          "access" in result ? (result as { access: unknown }).access : null;
        setPlanAccess(access === "demo" ? "demo" : access === "none" ? "none" : "unavailable");
      } catch {
        if (active) setPlanAccess("unavailable");
      }
    }
    void checkActiveYear();
    return () => { active = false; };
  }, [session?.access_token, recheck]);

  const signOut = useCallback(async () => {
    if (!client) return;
    setBusy(true);
    setError(null);
    try {
      // Planner-only sign-out. Do not automatically re-enter SSO afterward.
      const { error: signOutError } = await client.auth.signOut({ scope: "local" });
      if (signOutError) throw signOutError;
      setSession(null);
      setPlanAccess("none");
      setStarting(false);
    } catch {
      setError("Couldn't sign out of the planner. Please try again.");
    } finally {
      setBusy(false);
    }
  }, []);

  const authenticated = Boolean(session?.user && !session.user.is_anonymous);
  // There is deliberately no intermediate "signed-in = member" UI. A member
  // must pass BOTH a validated OIDC login and current-year plan verification.
  const status: AuthStatus = starting || (authenticated && planAccess === "checking")
    ? "checking" : authenticated && planAccess === "demo" ? "signed-in" : "public";

  return <AuthContext.Provider value={{
    status, userId: session?.user.id ?? null, authenticated, planAccess,
    configured: Boolean(client), busy, error, signIn, signOut,
  }}>{children}</AuthContext.Provider>;
}

export function usePlannerAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("PlannerAuthProvider is missing");
  return context;
}
