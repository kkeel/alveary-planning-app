# Alveary website → Supabase Auth: isolated handoff proof

**Development only. Not an automatic member login and does not grant Demo data.**

## Implementation

The new, isolated Supabase Edge Function verifies a signed Memberstack member JWT (RS256 / member JWKS / issuer / exact audience / expiration / type / identity) and checks the active LIVE 2027–28 Testing Plan against Memberstack Admin API and server-held plan rules. An authenticated Webflow page can request a 60-second single-use handoff code bound to a random PKCE challenge and state. The callback on plan.alveary.org redeems it atomically; the code alone is useless without the secret verifier retained in sessionStorage at the planner origin.

For the first technical proof, the backend uses Supabase Auth Admin generateLink and verifyOtp on a randomly provisioned, isolated, nondeliverable-email TEST account linked server-side to the verified Memberstack ID. The test page then stores only genuine Supabase Auth credentials via setSession and confirms getUser. This does NOT attach the new Auth user to existing family data, and the current protected APIs continue denying private access unless the normal OIDC/entitlement checks pass.

The synthetic-account method is experimental. It requires security review and identity integration before members may use it. It is NOT evidence that Supabase directly accepts ordinary Memberstack JWTs as Auth sessions.

## Setup prerequisites

1. Run docs/sql/memberstack-passwordless-handoff-development.sql ONLY in Alveary Planning - Development, under reviewed migration tracking. Both tables have RLS enabled, no browser grants, and only service_role can consume codes or query the mappings.
2. Deploy supabase/functions/memberstack-handoff-proof/index.ts, with Supabase gateway verify_jwt=false because the issued JWT comes from Memberstack, and the function validates it cryptographically in code.
3. Keep the existing Memberstack Live API secret exclusively server-side. No additional Webflow headers or DNS subscriptions.
4. After backend negative tests, merge the new Next.js route at https://plan.alveary.org/auth-handoff/ into GitHub Pages.

## Manual same-tab test, no edits by Kathryn

Start at https://plan.alveary.org/auth-handoff/ and select Start website handoff test. The test redirects to the already-signed-in Alveary Webflow dashboard. It includes only public state and challenge in the query parameters. Open Chrome Console on that dashboard and run the following. Do not copy or show JWT values.

    (async () => {
      const q = new URLSearchParams(location.search);
      const state = q.get("alveary_handoff_state");
      const challenge = q.get("alveary_handoff_challenge");
      const memberJwt = window.$memberstackDom?.getMemberCookie?.();
      if (!state || !challenge || !memberJwt) {
        console.log("Missing handoff state/challenge or Alveary login.");
        return;
      }
      const result = await fetch(
        "https://fzitmrzuxxdmvrhftdkr.supabase.co/functions/v1/memberstack-handoff-proof",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + memberJwt
          },
          cache: "no-store",
          credentials: "omit",
          body: JSON.stringify({ action: "issue", state, challenge })
        }
      );
      const data = await result.json();
      if (!result.ok || typeof data.code !== "string") {
        console.table({ httpStatus: result.status, error: data.error ?? "unknown" });
        return;
      }
      window.location.assign(
        "https://plan.alveary.org/auth-handoff/#code=" +
          encodeURIComponent(data.code) + "&state=" + encodeURIComponent(state)
      );
    })();

The code travels only as a one-time URL fragment (NOT the website JWT, Supabase access token or refresh token), bound to the planner-origin PKCE secret. The page immediately strips the fragment, redeems, and confirms a real Supabase session. It does not load family data and should not show Demo planning without additional server-side integration.

## Acceptance before any broader rollout

- Valid Testing Plan signed member: a single valid, refreshable Supabase Auth TEST session, which persists across browser reloads.
- Missing, forged, invalid, expired, wrong issuer/audience or wrong-type Memberstack JWT: issue denied.
- Member without active Testing Plan: issue denied.
- Wrong state, wrong verifier, used code, expired code: redemption denied.
- Redeem from Webflow origin instead of plan.alveary.org: denied.
- Missing/forged browser Origin and malformed inputs: denied.
- No browser reads of handoff SQL tables or privileged functions.
- No member ID, child name, session token, secret, OTP, email, or account metadata in logs or redirect URLs.
- Current demo-students, demo-course-planning and memberstack-plan-access behavior remains unchanged.
- Test default iPhone Safari as well as desktop before planning an automatic button integration.

Once the technical proof succeeds, implement a canonical trusted Memberstack-ID -> Supabase Auth user/workspace mapping and current-year permission checks in a separate reviewed PR. Only after authorization is correct should Kathryn receive a dashboard-specific button script. Retain a safe clear-session/account-switch path even if the main app doesn't prominently display Sign out.

References:
https://supabase.com/docs/reference/javascript/auth-admin-generatelink
https://supabase.com/docs/reference/javascript/auth-verifyotp
https://supabase.com/docs/guides/auth/sessions
https://docs.memberstack.com/hc/en-us/articles/7253255689755-Using-Permissions-and-Token-Verification-to-Secure-Your-Site-on-a-Custom-Backend

## First real signed-in browser result — November 17, 2026

After PR #92 merged, the user completed a same-tab Webflow dashboard handoff. Aggregate development database observations: one handoff code issued and consumed, one Memberstack-to-synthetic-test-account mapping, and one Supabase Auth session. The browser displayed **Signed in · Public access**, plus HTTP 403 from the normal current-year entitlement checker. This is expected: the synthetic account lacks the existing trusted Custom OIDC identity. It must NOT gain access to Demo private data.

The original test page lost its success state because the app shell remounted userId-keyed planning providers when the Auth identity changed. The test page also instantiated a second Supabase client, causing a duplicate GoTrueClient warning.

Follow-up: bypass keyed planning/data providers for the isolated proof route; reuse one shared Supabase Auth client; on reload, call Supabase getUser and require trusted test-only app metadata to show the existing session as verified. Suppress the automatic hosted OIDC redirect only for this proof route. The synthetic test account still receives no private permissions; avoid the known-failing entitlement check for that synthetic account without changing normal member authorization.

**Next user verification after the fix is merged and deployed:** Refresh https://plan.alveary.org/auth-handoff/ once and confirm the existing test session. Do not redo the handoff or share JWTs. Actual private Demo access requires a separate trusted identity/workspace integration and security review.


## Follow-up: canonical private family access (PR #95)

The previous sections document the original isolated authentication proof and are retained as historical test context. **PR #95 extends development-only private authorization**: both the previously trusted Custom OIDC session and a verified website-handoff Supabase Auth test session now resolve to the same server-verified Memberstack member ID and canonical 2027–28 family workspace. The normal independent active Testing Plan gate remains required for every private operation. This does not mean a successful session automatically grants private data.

In development, the existing Memberstack member's OIDC family workspace contains 3 student records and 36 saved course choices (aggregate database counts, no names or IDs disclosed). The new member-to-session binding is designed to reuse those exact records, not copy them. A browser test after merging PR #95 is still required to verify actual students/course loads and account isolation.

The email-based synthetic Auth user and any stored test session remain **development-only**; this is not an approved production account recovery/identity-linking policy. The member-facing dashboard script and mobile Safari rollout remain pending.
