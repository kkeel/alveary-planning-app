"use client";

import { useCallback, useEffect, useState } from "react";
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
type CheckResult = "not-checked" | "checking" | "verified" | "missing" | "invalid" | "unavailable";

type MemberstackBrowser = {
  getMemberCookie: () => string | null | undefined;
};

declare global {
  interface Window {
    $memberstackDom?: MemberstackBrowser;
    $memberstackReady?: boolean;
    memberstackConfig?: { useCookies: boolean; setCookieOnRootDomain: boolean };
  }
}

/**
 * Development-only diagnostic. This checks the signed Memberstack identity
 * without treating identity as authorization to any private data.
 */
export default function MemberstackConnectionCheck() {
  const [scriptReady, setScriptReady] = useState(false);
  const [result, setResult] = useState<CheckResult>("not-checked");
  const [roleCompatible, setRoleCompatible] = useState<boolean | null>(null);

  useEffect(() => {
    // A global beforeInteractive script can be ready before React hydrates.
    // Memberstack publishes both a readiness flag and a one-time event.
    const ready = () => {
      if (window.$memberstackReady && window.$memberstackDom?.getMemberCookie) {
        setScriptReady(true);
      }
    };
    ready();
    document.addEventListener("memberstack.ready", ready);
    return () => document.removeEventListener("memberstack.ready", ready);
  }, []);

  const verify = useCallback(async () => {
    setRoleCompatible(null);
    const token = window.$memberstackDom?.getMemberCookie?.();
    if (typeof token !== "string" || !token) {
      setResult("missing");
      return;
    }
    if (!projectUrl) {
      setResult("unavailable");
      return;
    }
    setResult("checking");
    try {
      // Never write the token to localStorage, URLs, console, React state or
      // logs. Only send it over HTTPS directly to the verification function.
      const response = await fetch(projectUrl + "/functions/v1/memberstack-identity-check", {
        method: "POST",
        mode: "cors",
        cache: "no-store",
        credentials: "omit",
        headers: { Authorization: "Bearer " + token },
      });
      const body: unknown = await response.json();
      if (!response.ok) {
        setResult(response.status === 401 ? "invalid" : "unavailable");
        return;
      }
      if (!body || typeof body !== "object" || !("verified" in body) ||
          (body as { verified?: unknown }).verified !== true) {
        setResult("unavailable");
        return;
      }
      const parsed = body as { directSupabaseRoleCompatible?: unknown };
      setRoleCompatible(parsed.directSupabaseRoleCompatible === true);
      setResult("verified");
    } catch {
      setResult("unavailable");
    }
  }, []);

  return <>
    <div className="ms-connection-check" role="group" aria-label="Memberstack connection diagnostic">
      <button type="button" disabled={!scriptReady || result === "checking"}
        onClick={() => void verify()}>
        {result === "checking" ? "Checking Alveary session…" : "Check Alveary connection"}
      </button>
      {result === "verified" && <span role="status">
        Alveary identity verified. {roleCompatible
          ? "Token supports the Supabase role claim."
          : "Direct Supabase token access requires an additional role claim."}
        {" "}Demo access is not enabled yet.
      </span>}
      {result === "missing" && <span role="status">
        No shared Alveary login found on this domain. Check that Memberstack root-domain
        cookies are enabled on the Alveary website and sign in there again.
      </span>}
      {result === "invalid" && <span role="status">
        A Memberstack token was found, but verification failed. Try signing into
        Alveary again; no planning access was granted.
      </span>}
      {result === "unavailable" && <span role="status">
        Connection check unavailable. Public pages remain accessible.
      </span>}
      {result === "not-checked" && <span>
        Development check only; no membership access is granted.
      </span>}
    </div>
  </>;
}
