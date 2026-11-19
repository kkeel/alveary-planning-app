# Same-tab dashboard-click handoff — 2027–28 test dashboard ONLY

**Stage only after the matching planner PR has merged and deployed.** Kathryn should replace only the existing **page-specific Before </body>** script on `https://alveary.org/alveary-2027-2028/dashboard-test`. Keep a copy of the old callback for immediate rollback. Do not modify Memberstack sitewide, the actual 2026–27 app, Webflow login logic, or the existing button URL (`https://plan.alveary.org/?connect=1`).

## Intended flow and security

When the existing Planning App button is clicked, **stay on the same dashboard tab** and show a calm "Gathering your planner…" overlay. A hidden, temporary **same-site** `plan.alveary.org` iframe generates and retains the private PKCE verifier on the planner origin. It posts only the public state and challenge to its exact `https://alveary.org` parent. The dashboard reads the already authenticated Memberstack JWT and asks our existing `memberstack-handoff-proof` Edge Function for a 60s single-use code bound to the challenge. It posts the code to the exact iframe source/origin. The iframe redeems using its private verifier and persists Supabase Auth locally. **Only after the planner verifies and saves the session** does the dashboard navigate the *same tab* to `https://plan.alveary.org/`. Memberstack bearer, PKCE verifier, and Supabase tokens never go in the URL or to the parent page.

This is a **test-only Safari hypothesis**. Safari may partition/deny iframe storage, or frame restrictions may block loading. Before enabling member access beyond testers, verify that the stored iframe Supabase session is available in top-level planner navigation on the iPad. If not, roll back; do not weaken PKCE.

## Kathryn's replacement page-specific script

```html
<script>
(() => {
  const WEBSITE_ORIGIN = "https://alveary.org";
  const PLANNER_ORIGIN = "https://plan.alveary.org";
  const TEST_PATH = "/alveary-2027-2028/dashboard-test";
  if (location.origin !== WEBSITE_ORIGIN ||
      location.pathname.replace(/\/$/, "") !== TEST_PATH) return;

  const ENDPOINT =
    "https://fzitmrzuxxdmvrhftdkr.supabase.co/functions/v1/memberstack-handoff-proof";
  const valid43 = /^[A-Za-z0-9_-]{43}$/;
  let pending = null;

  function status(message, failed = false) {
    if (!pending) return;
    pending.overlay.querySelector("[data-alveary-handoff-message]").textContent = message;
    const retry = pending.overlay.querySelector("[data-alveary-handoff-retry]");
    retry.hidden = !failed;
  }

  function closeConnection() {
    if (!pending) return;
    clearTimeout(pending.timeout);
    pending.overlay.remove();
    pending.frame.remove();
    pending = null;
  }

  async function signedToken() {
    for (let n = 0; n < 32; n++) {
      try {
        const jwt = window.$memberstackDom?.getMemberCookie?.();
        if (typeof jwt === "string" && jwt.split(".").length === 3) return jwt;
      } catch { /* Memberstack initializing */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return null;
  }

  document.addEventListener("click", event => {
    if (pending || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const anchor = event.target?.closest?.("a[href]");
    if (!anchor) return;
    let target;
    try { target = new URL(anchor.href); } catch { return; }
    if (target.origin !== PLANNER_ORIGIN || target.pathname !== "/" ||
        target.searchParams.get("connect") !== "1") return;
    event.preventDefault();

    const overlay = document.createElement("div");
    overlay.id = "alveary-planner-connection";
    overlay.setAttribute("role", "status");
    overlay.setAttribute("aria-live", "polite");
    overlay.style.cssText = "position:fixed;inset:0;z-index:2147483647;background:#faf9f5;color:#344536;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;font-family:inherit";
    overlay.innerHTML = '<div style="max-width:480px"><div style="font-size:13px;letter-spacing:.14em;text-transform:uppercase;margin-bottom:12px">Alveary</div><h1 style="font-size:clamp(24px,5vw,36px);margin:0 0 12px">Gathering your planner…</h1><p data-alveary-handoff-message>Connecting securely to your school-year planning space.</p><button data-alveary-handoff-retry hidden type="button" style="padding:10px 16px;margin-top:12px">Return to dashboard</button></div>';
    const frame = document.createElement("iframe");
    frame.src = PLANNER_ORIGIN + "/auth-handoff/?auto=1&frame=1";
    frame.title = "Secure Alveary planning connection";
    frame.style.cssText = "position:absolute;width:1px;height:1px;opacity:0;pointer-events:none";
    frame.setAttribute("aria-hidden", "true");
    pending = { overlay, frame, issued: false, expires: Date.now() + 45000 };
    overlay.querySelector("[data-alveary-handoff-retry]").addEventListener("click", closeConnection);
    pending.timeout = setTimeout(() => {
      if (pending) status("The connection didn't finish. Your account is safe. Please try again.", true);
    }, 45000);
    document.body.append(overlay, frame);
  }, true);

  window.addEventListener("message", async event => {
    if (!pending || event.origin !== PLANNER_ORIGIN ||
        event.source !== pending.frame.contentWindow ||
        Date.now() > pending.expires) return;
    const payload = event.data;
    if (!payload || typeof payload !== "object") return;
    if (payload.type === "alveary:planner:complete") {
      clearTimeout(pending.timeout);
      location.assign(PLANNER_ORIGIN + "/");
      return;
    }
    if (payload.type === "alveary:planner:failed") {
      status("We couldn't connect this time. Please return to the dashboard and retry.", true);
      return;
    }
    if (payload.type !== "alveary:planner:ready" || pending.issued ||
        typeof payload.state !== "string" || !valid43.test(payload.state) ||
        typeof payload.challenge !== "string" || !valid43.test(payload.challenge)) return;
    pending.issued = true;
    const current = pending;
    try {
      const jwt = await signedToken();
      if (!jwt || pending !== current) throw new Error("website_session_unavailable");
      const response = await fetch(ENDPOINT, {
        method: "POST", mode: "cors", cache: "no-store", credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + jwt,
        },
        body: JSON.stringify({
          action: "issue", state: payload.state, challenge: payload.challenge,
        }),
      });
      const result = await response.json();
      if (!response.ok || !valid43.test(result?.code)) throw new Error("issue_rejected");
      if (pending !== current) return;
      event.source.postMessage({
        type: "alveary:planner:code",
        state: payload.state,
        code: result.code,
      }, PLANNER_ORIGIN);
    } catch {
      if (pending === current) {
        status("We couldn't confirm your Alveary sign-in. Please return to your dashboard and retry.", true);
      }
    }
  });
})();
</script>
```

## Rollout and rollback

1. Merge planner PR after checks pass; leave existing Webflow snippet unchanged until ready to test.
2. Kathryn keeps backup of the old snippet, replaces only the page-specific test dashboard code above and publishes. No new Webflow page or button URL is needed.
3. Test on **iPad Safari** after clearing *planner* session (or Safari Private tab signed into the website). Click Planning App: one tab, no return to homepage/login, then the **existing Test Student** appears. If a planner session already exists, existing session path should complete quickly.
4. Try with a fresh Safari session and again with a saved session, then Chrome, and confirm no duplicate provisioning claim/workspace. Check disabled Testing Plan fails closed; public Course List, Book List and Supplies remain normal.
5. If Safari storage partitioning means the iframe's session does not survive navigation, or frame won't load, restore previous Webflow snippet immediately. Investigate an alternative first-party bridge with secure server-validated proof. The current login loop is inconvenient but working; never lower authentication security for convenience.

**Limitations:** Some browsers may block or partition iframe storage even when both pages are on the same site. The iframe is a controlled, temporary authentication helper—not a substitute for checking live membership on private APIs. This is not a production authorization or PWA reconnect rollout.
