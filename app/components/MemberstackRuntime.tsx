"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isPublicCatalogPath } from "./public-catalog-routes";

// Load the Memberstack browser SDK only in the authenticated planner/handoff
// experience. A fresh visit to /public/courses or /public/books makes no
// Memberstack network request and runs no membership probe.
export default function MemberstackRuntime() {
  const pathname = usePathname();
  useEffect(() => {
    if (isPublicCatalogPath(pathname)) return;
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
