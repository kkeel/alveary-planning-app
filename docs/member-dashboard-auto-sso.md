# Dashboard-initiated Memberstack SSO (development preview)

**Purpose:** Use the already-tested, prompt-free Memberstack Custom SSO flow when a member intentionally enters the planner from the Alveary test dashboard. This change does not depend on shared root-domain cookies or require any change to Webflow's login script.

## Entry contract

- **Reliable member dashboard link:** `https://plan.alveary.org/?connect=1`. Only the dashboard's Planning App link should use this marker. It is merely a navigation hint, not proof of login or paid membership.
- **Convenience fallback for the currently deployed plain link:** If the browser exposes the *full* referring URL and its HTTPS origin is exactly `alveary.org` or `www.alveary.org` with path `/alveary-2027-2028/dashboard-test`, the planner starts SSO even without the query flag.
- **Privacy limitation:** Most browsers' default cross-origin referrer policy reveals only the origin, not the path. When the full dashboard path isn't available, the app deliberately stays in Public view rather than send every ordinary visitor arriving from an Alveary public link into a login flow. Updating the **link destination only** to `?connect=1` is therefore required for reliable auto-SSO. The user does not have Webflow access; this can be supplied to a website administrator as a one-line, low-risk link-only change.
- **Direct public visits:** `https://plan.alveary.org/`, `/courses`, `/books` and `/supplies` without the query flag and without a full dashboard referrer remain public and do not initiate SSO.
- **Returning member with a planner session:** Restore that session and remove `?connect=1`, without a new OAuth redirect.
- **First-time member:** Initiate `custom:memberstack` Supabase OAuth in the same tab with the existing Memberstack skip-login configuration. On successful return, the app shows the signed-in *development preview*, subject to no current paid-plan verification. If an error or missing session returns, show an actionable error and do not loop.
- **Explicit planner-only sign-out:** Do not automatically re-run SSO on local logout. This does not sign the person out of the main Alveary site; coordinated logout remains future work.

## QA checks

1. While already signed in at `https://alveary.org/`, open `https://plan.alveary.org/?connect=1` in the **same browser context**. The app should start SSO automatically and return with Signed in, without needing to press **Try Alveary SSO**.
2. Try the plain test-dashboard button: if it still opens Public view, this is expected when the dashboard's referrer is origin-only. Ask a Webflow administrator to change just that button's link destination to `https://plan.alveary.org/?connect=1` when convenient; don't edit Memberstack's global install.
3. Sign out of planner only. Confirm it stays Public view and public courses remain usable; direct public entry stays public.
4. Open a private window without signing into Alveary and visit plain `/courses`. Confirm no redirect; the List-only public view remains available.
5. Keep all `member_identity_links`, `member_entitlements`, workspaces, and RLS access blocked until real Memberstack plan verification has been implemented. A Supabase session alone is not plan authorization.

## Confirmation email recheck

Supabase's built-in Auth SMTP provider limits sending to **2 emails per hour per project** (current November 2026 documentation). At the previous test, two earlier `mail.send` confirmation entries occurred before the fresh-account login without a `mail.send` entry. The newly recreated Supabase user has no stored email field, consistent with the `email_optional=true`, `scopes=['openid','profile']` provider. Do not conclude the problem is solved solely from absence of an email.

Recheck after the email rate limit refreshes, and verify both the user's inbox and Supabase Auth logs for that attempt. The app should remain Signed in either way; if there is no email and no `mail.send` or rate-limit error, this is stronger evidence than inbox absence alone. Leave global Confirm email enabled and keep the working OAuth settings unchanged.

Official docs:
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/testing-auth-flows
