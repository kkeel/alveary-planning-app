# Candidate: direct dashboard-click handoff (2027–28 testing dashboard only)

**Status: STAGED — do not install until the corresponding GitHub PR is merged and deployed.** Preserve a copy of the current callback in `docs/webflow-dashboard-passwordless-handoff.md`. Replace the *page-specific* Before `</body>` code only after approval. Do not touch the global Memberstack script, Webflow login redirects, or 2026–27 website.

## Member experience
Memberstack login → 2027–28 testing dashboard → click existing **Planning App** button → **new planner tab** displays “Opening your Planning App…” → authenticated private workspace. There is **no trip back to the protected dashboard and no second login**. This version intentionally opens a new browser tab to keep both first-party origins running at the same time, with the planner retaining its PKCE verifier in its own origin. Once Safari compatibility is confirmed, we can evaluate whether a same-tab flow is safe. Do not silently loosen PKCE to avoid the tab.

The current button URL remains `https://plan.alveary.org/?connect=1` so it works as a fallback if the page-specific code is not installed. This script intercepts only normal unmodified left-clicks on that exact private-planner link; public Course List, Book List and Supplies links are unaffected.

## Replacement page-specific script for Kathryn

```html
<script>
(() => {
  if (location.origin !== "https://alveary.org" ||
      location.pathname.replace(/\/$/, "") !==
      "/alveary-2027-2028/dashboard-test") return;

  const PLANNER_ORIGIN = "https://plan.alveary.org";
  const AUTH_FUNCTION =
    "https://fzitmrzuxxdmvrhftdkr.supabase.co/functions/v1/memberstack-handoff-proof";
  const valid43 = /^[A-Za-z0-9_-]{43}$/;
  const authorizedWindows = new Map();
  const pendingByState = new Map();

  async function signedMemberToken() {
    for (let n = 0; n < 32; n++) {
      try {
        const candidate = window.$memberstackDom?.getMemberCookie?.();
        if (typeof candidate === "string" &&
            candidate.split(".").length === 3) return candidate;
      } catch { /* SDK still initializing */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    return null;
  }

  // Permit only the user's deliberate click on the exact personal planner
  // button; do not interfere with the public catalog pages.
  document.addEventListener("click", event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.altKey || event.shiftKey) return;
    const link = event.target?.closest?.("a[href]");
    if (!link) return;
    let url;
    try { url = new URL(link.href); } catch { return; }
    if (url.origin !== PLANNER_ORIGIN ||
        url.pathname !== "/" ||
        url.searchParams.get("connect") !== "1") return;
    event.preventDefault();

    // Must be synchronous with the click, before any async membership calls,
    // or Safari will block the tab. Do not use noopener: the two windows need
    // their exact-source message channel for a short-lived PKCE handshake.
    const plannerWindow = window.open(
      PLANNER_ORIGIN + "/auth-handoff/?auto=1&bridge=1", "_blank");
    if (!plannerWindow) {
      window.alert("Please allow the Planning App to open in a new tab, then try again.");
      return;
    }
    authorizedWindows.set(plannerWindow, Date.now() + 45000);
  }, true);

  window.addEventListener("message", async event => {
    if (event.origin !== PLANNER_ORIGIN ||
        !event.source || !authorizedWindows.has(event.source)) return;
    if (Date.now() > authorizedWindows.get(event.source)) {
      authorizedWindows.delete(event.source);
      return;
    }
    const payload = event.data;
    if (!payload || payload.type !== "alveary:planner:ready" ||
        !valid43.test(payload.state) || !valid43.test(payload.challenge)) return;
    if (pendingByState.has(payload.state)) return;
    pendingByState.set(payload.state, true);
    try {
      const token = await signedMemberToken();
      if (!token) throw new Error("website_login_unavailable");
      const response = await fetch(AUTH_FUNCTION, {
        method: "POST", mode: "cors", cache: "no-store", credentials: "omit",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({
          action: "issue", state: payload.state, challenge: payload.challenge,
        }),
      });
      const result = await response.json();
      if (!response.ok || typeof result.code !== "string" ||
          !valid43.test(result.code)) throw new Error("handoff_issue_failed");
      // The short-lived, single-use code crosses only an exact-origin message.
      // The Memberstack JWT, PKCE verifier and Supabase tokens never cross.
      event.source.postMessage({
        type: "alveary:planner:code",
        state: payload.state,
        code: result.code,
      }, PLANNER_ORIGIN);
      authorizedWindows.delete(event.source);
    } catch {
      // The planner tab times out to a safe retry screen. No website login
      // redirect or silent fallback to a weaker token transfer.
      authorizedWindows.delete(event.source);
    } finally {
      pendingByState.delete(payload.state);
    }
  });
})();
</script>
```

## Preflight and acceptance criteria
1. Merge/deploy matching planner code first; the page-only script is inert until installed. Do not install it on the global Webflow layout.
2. Kathryn replaces the old **page-specific** callback snippet with the script above, publishes the test dashboard only, and retains the old script for rollback. No change to the existing button URL.
3. On a signed-in iPad Safari dashboard, click the existing button once. One planner tab should open. It should complete the PKCE-bound issue/redeem exchange, show the existing Test Student, and **not** send the user back to Alveary homepage or login.
4. Repeat in Chrome Incognito with the website logged in and planner session absent. Confirm exactly one account/workspace, not a duplicate. Test iPhone Safari, Safari with tab focus changes, and browser popup restrictions.
5. Test no Memberstack login, inactive Testing Plan, closed opener/tab and expired handoff; all fail closed with a retry message. Confirm separate public Course/Book/Supplies links are unchanged.
6. If mobile Safari suspends the dashboard tab and the handshake fails, **roll back the page-specific script** and investigate a server-mediated first-party bridge instead of moving credentials into URLs.
7. Keep Supabase launch plan rows disabled and the existing one-use handoff backend unchanged. The saved PWA icon reconnect flow is a separate milestone.

## Rationale and limitations
Opening a planner tab directly from a user click is a deliberate trade-off: the authenticated website and planner must coexist briefly so the planner can generate and retain its private verifier and send its *public* state/challenge to the website. Exact `event.origin` and `event.source` checks prevent unrelated pages from supplying a login code. We haven't yet verified iPad Safari keeps the opener active long enough; the PR is **not** evidence that the UX works on-device. No Supabase API or database changes are necessary for this staged experiment.
