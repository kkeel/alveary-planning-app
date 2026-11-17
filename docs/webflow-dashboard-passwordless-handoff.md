# Dashboard-only Webflow handoff — mobile Safari fallback

**Use only if the Planning App cannot read the Memberstack root-domain cookie.** The shared-cookie fast path requires no Webflow edit. This is an isolated *test-only* step for the verified 2027–28 pilot user, not a finished member rollout.

The existing Webflow dashboard already exposes a valid signed Memberstack member JWT through `$memberstackDom.getMemberCookie()` (verified on Nov 17). The planner's `/auth-handoff/` creates the browser's state and PKCE challenge before navigating back to that dashboard. This tiny callback only issues a **60-second single-use code**, which returns to the planner. The actual session is created by the Supabase backend, never by Webflow code.

## Minimal request for Kathryn

On the **Alveary 2027–28 testing dashboard page only** (`https://alveary.org/alveary-2027-2028/dashboard-test`), add this to the page-specific **Before </body>** custom code. Do **not** replace the Memberstack script, alter the global header, change DNS, or edit the current 2026–27 site.

```html
<script>
(() => {
  // Ignore visits that are not an explicit one-time Planning App handoff.
  if (location.hostname !== "alveary.org" &&
      location.hostname !== "www.alveary.org") return;
  if (location.pathname.replace(/\/$/, "") !==
      "/alveary-2027-2028/dashboard-test") return;

  const params = new URLSearchParams(location.search);
  const state = params.get("alveary_handoff_state");
  const challenge = params.get("alveary_handoff_challenge");
  const valid = /^[A-Za-z0-9_-]{43}$/;
  if (!state && !challenge) return; // Normal member dashboard: unchanged
  if (!state || !challenge || !valid.test(state) || !valid.test(challenge)) return;
  if (window.__alvearyPlannerHandoffStarted) return;
  window.__alvearyPlannerHandoffStarted = true;

  function showStatus(message) {
    let notice = document.getElementById("alveary-planner-handoff-status");
    if (!notice) {
      notice = document.createElement("p");
      notice.id = "alveary-planner-handoff-status";
      notice.setAttribute("role", "status");
      notice.style.cssText =
        "padding:14px 18px;background:#f7f5ed;color:#344536;margin:12px;";
      document.body.prepend(notice);
    }
    notice.textContent = message;
  }

  (async () => {
    showStatus("Connecting you to Alveary Planning…");
    // Webflow uses Memberstack's standard site script. It can take time to
    // initialize, especially when mobile Safari wakes an existing session.
    let token = null;
    for (let attempt = 0; attempt < 32; attempt++) {
      try {
        const candidate = window.$memberstackDom?.getMemberCookie?.();
        if (typeof candidate === "string" && candidate.split(".").length === 3) {
          token = candidate;
          break;
        }
      } catch { /* Memberstack not initialized yet */ }
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    if (!token) {
      showStatus("Your Alveary sign-in could not be confirmed here. Please sign in to Alveary and try opening Planning again.");
      return;
    }
    try {
      const response = await fetch(
        "https://fzitmrzuxxdmvrhftdkr.supabase.co/functions/v1/memberstack-handoff-proof",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
          },
          cache: "no-store",
          credentials: "omit",
          body: JSON.stringify({ action: "issue", state, challenge })
        }
      );
      const result = await response.json();
      if (!response.ok || typeof result.code !== "string") {
        showStatus("We couldn't connect Planning right now. Your Alveary account is still signed in.");
        return;
      }
      // Never put the Memberstack token or Supabase credentials in a URL.
      // The short-lived code is bound to the secret held by plan.alveary.org.
      location.replace(
        "https://plan.alveary.org/auth-handoff/?auto=1#code=" +
        encodeURIComponent(result.code) + "&state=" + encodeURIComponent(state)
      );
    } catch {
      showStatus("Planning could not connect. Please try again from the dashboard.");
    }
  })();
})();
</script>
```

## Test and rollback

Once saved/published on the test dashboard, the browser's normal planner entry can use `/auth-handoff/?auto=1`. If the root cookie is unavailable in Safari, the planner can start a PKCE-bound roundtrip to the Webflow dashboard, which completes automatically with this code.

For the current staged test, the fallback button on the handoff page can start the Webflow leg. A final one-tap automatic fallback will be enabled only after this dashboard snippet is confirmed deployed. No sitewide script is required.

Rollback: remove this page-specific snippet. It has no effect on normal dashboard visits without the handoff query parameters. The existing Memberstack site login and current-year website remain unchanged.

**Security note:** This pilot currently accepts only already-provisioned development Auth accounts. Do not enable new self-provisioning or consider the synthetic email-account method production-ready until account recovery, email ownership, session revocation and cross-account isolation have been reviewed.
