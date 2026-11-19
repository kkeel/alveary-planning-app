"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// The shared Memberstack cookie SDK is needed for the explicit passwordless
// handoff route, but NOT for ordinary website visitors browsing Course/Book
// Lists. A public catalog visit never starts the SDK or any OIDC handoff.
export default function MemberstackRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    const isHandoff = pathname.replace(/\/$/, "") === "/auth-handoff";
    if (!isHandoff) return;
    const memberstackWindow = window as Window & {
      memberstackConfig?: { useCookies: boolean; setCookieOnRootDomain: boolean };
    };
    memberstackWindow.memberstackConfig = {
      useCookies: true,
      setCookieOnRootDomain: true,
    };
    if (document.getElementById("alveary-memberstack-sdk")) return;
    const script = document.createElement("script");
    script.id = "alveary-memberstack-sdk";
    script.src = "https://static.memberstack.com/scripts/v2/memberstack.js";
    script.setAttribute("data-memberstack-app", "app_clbb9rspy00160ujl6tsxbsrj");
    script.setAttribute("data-memberstack-use-cookies", "");
    script.async = true;
    document.head.appendChild(script);
  }, [pathname]);
  return null;
}
