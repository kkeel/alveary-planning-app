# Calm entry and current-year Demo entitlement (November 14, 2026)

## Goal

Member dashboard entry via `https://plan.alveary.org/?connect=1`:
1. Display one calm "Connecting to Alveary" screen, never public navigation followed by member navigation.
2. Restore a Supabase Auth session or launch the existing Memberstack Custom OIDC flow.
3. Verify the current-year **Testing Plan** on Memberstack's Admin REST API, using an authenticated Supabase session and a server-only Memberstack Live secret key.
4. Show Demo planning only for members whose live Memberstack plan connection is `ACTIVE`. Otherwise show the public List-only Course, Book and Supplies views.

The page's "signed-in" planning view now means authenticated **and entitled**, rather than authenticated only. Private member database tables remain closed to browsers (RLS), and Students/My Plan are still preview placeholders—not saved member records.

## Server function

`supabase/functions/memberstack-plan-access/index.ts` is deployed to Alveary Planning – Development with `verify_jwt: true`.

- Browser POSTs its Supabase session JWT in `Authorization: Bearer ...` with the public Supabase publishable key in `apikey`.
- Function checks the JWT with `admin.auth.getUser(jwt)`. It then obtains the authenticated user's Memberstack Custom OIDC identity from Supabase Auth Admin, **not** client-supplied JSON/email/user metadata.
- Existing OIDC member subjects use the signed pattern `<24-lowercase-hex-member-id>_app_clbb9rspy00160ujl6tsxbsrj`. Function strictly checks the exact app suffix before extracting the member ID. If the subject format differs, it denies access pending review.
- Function uses `MEMBERSTACK_LIVE_SECRET_KEY` to GET `https://admin.memberstack.com/members/<verified-member-id>` and confirms response identity. Memberstack API returns `planConnections`; only an exact **ACTIVE** plan connection present in the enabled Supabase server-side mapping grants Demo.
- Test configuration: `memberstack_plan_access_rules` with Testing Plan `pln_testing-plan-vybk04zq`, `plan_kind='demo'`, `school_year='2027-28'`, `workspace_type='family'`, `capability='planning'`. The Demo identifier is **not** a real 2027–28 member plan and cannot roll test choices into one.
- No public `memberstack_plan_access_rules` reads; no Memberstack secret in GitHub, web variables or frontend source. Responses return only `access: "demo"|"none"|"unavailable"`, no member ID, plan ID, token, email or private profile.
- Missing or invalid token => 401; missing secret/Memberstack timeout/identity mismatch => unavailable, never grants access; no current plan => public.
- Recheck current plan on every fresh session and when returning to the browser tab; never authorize based on cached browser plan flags.

## One-time setup before live Demo verification

In **Supabase Dashboard → Alveary Planning – Development → Edge Functions → Secrets**, add:

- **Name:** `MEMBERSTACK_LIVE_SECRET_KEY`
- **Value:** your Memberstack application's **Live** secret API key (`sk_...`, **not** `sk_sb_...` test-mode key).
- Save there only. Never paste this value into chat, GitHub, source files, or any NEXT_PUBLIC variable.

Memberstack **Test Mode** and your live environment's **Testing Plan** are different: use the *Live* secret so Memberstack can find your real Testing Plan members. After saving, visit `https://plan.alveary.org/?connect=1` in a fresh browser already signed into Alveary.

A Memberstack Admin API mismatch for a legacy 24-hex member ID will present "unable to verify" rather than incorrectly granting access; inspect server-side function logs and provider member ID mapping before trying another solution.

## Manual test matrix

1. **Eligible**: live Memberstack account with current active Testing Plan → one connecting screen, then Demo Planning, not public first.
2. **No eligible plan**: valid Alveary login but no active Testing Plan → one connecting screen, then public List view; Students, Schedule, Lesson Plans, Exams and Year at a Glance hidden and direct URLs blocked.
3. **Plan revoked**: remove Testing Plan from an account, refresh/return to tab → public; re-add active plan → Demo on fresh verification.
4. **Signed out**: direct `/courses` visitor → public List only; no automatic SSO. Explicit local planner sign-out stays Public.
5. **Server offline/missing Live secret**: signed-in user → public with a clear "couldn't verify plan" message; never show private pages.
6. **Unauthorized API**: missing/invalid Bearer JWT gets 401; tests must be repeated after secret setup and prior to enabling member data writes.

This is a development-only preview gate. Protect any actual student/planning records with workspace-scoped RLS and verified entitlements independently. A visually hidden React route is not a secure authorization boundary for protected data or downloadable PDFs.

References:
- https://docs.memberstack.com/hc/en-us/articles/17385829931419-Memberstack-Admin-Package-REST
- https://docs.memberstack.com/hc/en-us/articles/7253255689755-Using-Permissions-and-Token-Verification-to-Secure-Your-Site-on-a-Custom-Backend
- https://supabase.com/docs/guides/functions/auth-headers
- https://supabase.com/docs/guides/functions/secrets
