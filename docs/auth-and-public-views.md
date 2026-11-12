# Public browsing and planner sign-in

## Development connection checklist (November 11, 2026)

The Webflow testing dashboard links into the publicly hosted Planning App at `https://kkeel.github.io/alveary-planning-app/`. Supabase URL Configuration has the same Site URL and `https://kkeel.github.io/alveary-planning-app/**` on the redirect allow list.

CMI has entered both **repository variables** for the GitHub Actions build:
- `ALVEARY_SUPABASE_URL`
- `ALVEARY_SUPABASE_PUBLISHABLE_KEY` (the new `sb_publishable_` format, not the legacy anon key).

The build reads these values through `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Because Next.js statically exports to GitHub Pages, updates to the variables require a new build/deployment. This documentation update triggers that build.

**Global sign-out requirement (not implemented):** The user wants the app's Sign out action to end the Alveary Memberstack website session and as many connected-app sessions as the identity provider supports, not merely the local Supabase session. The current UI still calls `supabase.auth.signOut({scope: "local"})`; do not represent it as global sign-out. Design and test coordinated sign-out before accepting authentication as complete. Cross-app single logout is not guaranteed by OIDC SSO alone.

## Current deployment

Every page in this starter application is publicly accessible. **No curriculum records, member-only lesson packets, or family records are currently loaded.**

The bar directly below the page header replaces the development-preview status banner:
- **Public view**: no Supabase session has been established in this Planning App.
- **Checking sign-in**: restoring a configured Supabase session.
- **Signed in**: a Supabase Auth session exists. This does **not** mean the account has a current paid Alveary membership.

The "Sign in" action is meaningful in both configuration states:
- **Before** Supabase browser variables are configured: "Sign in" goes to the existing Alveary Webflow login at `https://alveary.org/login` **in the same tab**. This does not create a Supabase session. The visitor must return to the planner manually.
- **After** Supabase browser variables are configured: "Sign in" starts Memberstack OIDC through Supabase's `custom:memberstack` provider and returns to the exact Planning App page URL. A successful session changes the banner to "Signed in" and reveals a "Sign out" action.

"Sign out" uses `supabase.auth.signOut({ scope: "local" })` to end the current Planning App session and switch back to Public view while staying on the same page. It does **not** sign the user out of the separate Webflow/Memberstack website session. If we later add automatic SSO on every visit, we must avoid immediately reauthenticating a member who explicitly chose Public view.

## Enable a real authentication test (not yet done)

1. In GitHub repository **Settings → Secrets and variables → Actions → Variables**, add:
   - `ALVEARY_SUPABASE_URL`: the development project's HTTPS Supabase URL
   - `ALVEARY_SUPABASE_PUBLISHABLE_KEY`: the **publishable** key for the same project
2. **Never** use a Memberstack client secret, Supabase secret/service-role key, or database password as a browser variable.
3. In Supabase **Authentication → URL Configuration**, add `https://kkeel.github.io/alveary-planning-app/**` to the permitted Redirect URLs for OAuth return. For local testing add `http://localhost:3000/**` if needed. Set Site URL to the preview site if appropriate for this development project.
4. Verify that `custom:memberstack` is enabled in Supabase and its registered callback URL exactly matches the redirect configured in Memberstack Custom SSO.
5. Commit to main or run the GitHub Pages workflow, then test login from the Webflow testing dashboard in a normal browser and a private window.
6. Verify explicit sign-out stays in the public version of the app, without redirecting back into SSO.

No SQL tables or RLS policies have been configured in this PR. Implement verified, publication-year-specific entitlements before any paid or household data is loaded. A UI badge alone must **never** be used to protect restricted content.

## Content visibility principles

A route such as `/books`, `/courses`, `/supplies`, `/exams`, or `/lesson-plans` can remain publicly addressable. Actual restricted data must be fetched only under server-enforced access control (Supabase RLS and/or authorized signed delivery). Public visitors must not download restricted JSON, PDF or member data that was merely hidden in React.
