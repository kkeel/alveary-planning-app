# Public browsing and planner sign-in

## Development connection checklist (November 11, 2026)

The Webflow testing dashboard links into the publicly hosted Planning App at `https://kkeel.github.io/alveary-planning-app/`. Supabase URL Configuration has the same Site URL and `https://kkeel.github.io/alveary-planning-app/**` on the redirect allow list.

CMI has entered both **repository variables** for the GitHub Actions build:
- `ALVEARY_SUPABASE_URL`
- `ALVEARY_SUPABASE_PUBLISHABLE_KEY` (the new `sb_publishable_` format, not the legacy anon key).

The build reads these values through `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Because Next.js statically exports to GitHub Pages, updates to the variables require a new build/deployment. This documentation update triggers that build.

**Global sign-out requirement (not implemented):** The user wants the app's Sign out action to end the Alveary Memberstack website session and as many connected-app sessions as the identity provider supports, not merely the local Supabase session. The current UI still calls `supabase.auth.signOut({scope: "local"})`; do not represent it as global sign-out. Design and test coordinated sign-out before accepting authentication as complete. Cross-app single logout is not guaranteed by OIDC SSO alone.


## Webflow → planner entry (SSO test)

**Why the first test showed Public view:** Webflow and `kkeel.github.io` live on different browser origins. The planner cannot read the Webflow Memberstack session directly, and currently a plain link to the public planner intentionally does not launch OAuth.

1. In Memberstack **Authentication → Custom SSO**, edit **Alveary Planning - Development**.
2. Enable **Skip login for members already signed in on your site**. Memberstack's help center says this also enables **Skip the authorization screen**. Set the website URL to a page on `alveary.org` that loads Memberstack (the Webflow testing dashboard qualifies if it loads their script). Save.
3. Update the **member-dashboard Planning App button only** (not public Course/Book/Supply links) to point to `https://kkeel.github.io/alveary-planning-app/?connect=1`. Keep **Open in new tab** off.
4. The `connect=1` parameter is only an *instruction to start the normal OIDC authentication flow*; it is not proof of membership or a permission claim. The app removes the parameter immediately, starts Memberstack SSO in the same tab, and on success comes back to the normal Planning App URL.
5. When entering from a public Webflow link or visiting a route directly, omit `connect=1`. Public pages appear without any login redirect.

**Why the second test showed Public view again:** A Memberstack-hosted login screen can be expected while the skip-login switch is off. But a return to Public view *after completing the flow* means the application did not establish a Supabase session. The new client reports a sanitized OAuth error code (if supplied) or explains that no session was returned; it does not expose credentials, token fragments or authorization codes.

For diagnosis, check **Supabase → Authentication → Users** after the failed attempt: a new user suggests the identity-provider handoff worked but the browser callback/session restoration failed. No new user suggests that the handoff failed before a Supabase identity was created. Authentication logs are then the authoritative place to inspect the error. Never paste a full OAuth callback URL containing code, state or tokens into chat.

**Important:** Memberstack SSO reduces secondary prompts, but it may still briefly navigate through an external identity-provider domain. Since GitHub Pages is on a different root domain, it is not possible for the planner to directly inspect `alveary.org`'s signed-in cookie. We will eventually consider a dedicated Alveary subdomain for a more integrated production deployment.

Global sign-out is not done. For clarity the preview temporarily labels its existing action **Sign out (planner only)** until we can coordinate Memberstack/other application sessions.

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

## November 14 — Authentication-aware **UI preview** (NOT membership authorization)

The public/Planning shell now consumes a single Supabase Auth session state through `PlannerAuthProvider`, shared by the status bar and navigation. This is **a display-mode gate only**:

- **Public or checking:** the Course List is List-only; the Planning toggle, bookmark actions and Planning Desk are not shown. Courses, Books and Supplies stay public. Students, Scheduling, Lesson Plans, Exams and Year at a Glance are removed from the navigation and their client-rendered route bodies show a sign-in notice if opened directly.
- **Signed in:** the Course List defaults to Planning (but List can still be selected); the Planning Overview's Choose courses link explicitly opens Planning. The member-only route links appear. No new paid curriculum content or student data has been exposed.
- **Browser-local Think Tank prototype:** temporary draft selections are scoped by Supabase user ID on this device, not copied between accounts or migrated from the old shared prototype. Users may see an empty Think Tank after this update; this is expected and not an actual Supabase member plan.
- **Do not equate Supabase session with paid membership.** A signed-in basic-only, expired or test account may see the preview navigation; access to real private records must remain denied until Memberstack identity and year/workspace entitlements are independently verified server-side. No private rows are accessible through this UI.
- A static-export React route guard is **not** authorization for protected JSON/PDFs. Future member-only data must be fetched through RLS and appropriately secured delivery. Member authorization and Memberstack coordinated sign-out remain incomplete.

### SSO retest

Memberstack Custom SSO now has both Skip authorization screen and Skip login for members already signed in enabled, with the website check URL set to `https://www.alveary.org/`. The extra login screenshot shows Chrome **Incognito**; confirm whether the Alveary website session was established **in the same Incognito window**. Separate normal/incognito browser contexts do not share cookies. If the same-context test still prompts again, confirm the website URL truly loads Memberstack and compare canonical `www` vs non-`www` host; check Memberstack-hosted auth behavior. The logged-in test arriving "Signed in" establishes basic OIDC auth completion only; verification-email and member entitlement rules are separate unresolved tasks.


## November 19 — Canonical shared public/member catalog URLs

**Use exactly these links for both public Alveary website visitors and members:**
- Course List: `https://plan.alveary.org/courses/`
- Book List: `https://plan.alveary.org/books/` (currently a public coming-soon placeholder)

The same URL is the public entrypoint: the course catalog renders immediately as
browse-only content even when the planner is still restoring a cached session.
There is **no full-page Connecting to Alveary or membership-check gate** on
Course List / Book List. These pages show neither a sign-in banner nor any
private member data while access has not been established.

When a member already has a planner session, the existing Supabase session
restoration and server-side current-year entitlement check can upgrade the
same page with verified member-only planning tools. No automatic login flow is
initiated for anonymous visitors. Real private API calls remain subject to
server-side plan verification.

- The Memberstack browser SDK loads on the explicit `/auth-handoff/` path only;
  it does **not** load when anonymously browsing /courses/ or /books/.
- `?connect=1` is the deliberate member entry and remains reserved for
  website member-dashboard integrations. An Alveary Webflow referrer alone
  never initiates authentication.
- Do not add alternate `/public/courses` or `/public/books` paths.
- When the Book List adds product links, ensure the Amazon Associates links and
  their original accompanying content are reachable in a fresh private browser
  session without login. The Book List currently has no finished public
  content, so it should not be promoted as a finished affiliate surface.

The Amazon Associates Site list should include the publicly accessible
origin/page where affiliate links are actually shown; recording extra URLs
does not make gated content compliant.
