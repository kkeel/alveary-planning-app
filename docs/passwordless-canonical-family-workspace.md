# Passwordless Memberstack login → canonical 2027–28 family workspace

Status: **development integration**. This is not the final production sign-in: Webflow still requires the manual same-tab handoff test, and the synthetic email-based Supabase Auth account mechanism needs a separate production security review before handling real member data. Current 2026–27 website, GitHub Pages hosting, existing Memberstack configuration and Webflow are unchanged.

## Root cause and identity model

The real browser handoff confirmed that Supabase can create and refresh a genuine Auth session using a test-only synthetic email account. Unlike Custom OIDC, it has no `custom:memberstack` identity. All private Demo APIs previously rejected it even when the actual Memberstack member had the active Testing Plan.

The existing `member_identity_links` table also had a unique constraint on the Memberstack member ID. This prevented both the original OIDC Auth user and the signed website handoff Auth user from linking to the **same** Memberstack member and canonical family workspace.

This change preserves the unique `auth_user_id` primary key, RLS, and current browser privilege restrictions while allowing several trusted Auth identities for one member. The linked member identifier is always the canonical 24-hex Memberstack ID. The deterministic `familyWorkspaceId()` uses that ID, never the incidental Supabase Auth UUID, so saved students/course assignments are shared between verified login methods.

## Trust conditions for every private request

1. Supabase Auth validates the bearer JWT using `admin.auth.getUser(jwt)`. Anonymous or invalid sessions fail closed.
2. The backend resolves a **trusted** member ID using exactly one of:
   - Existing `custom:memberstack` OIDC identity with exact `<24hex>-app_clbb9rspy00160ujl6tsxbsrj` subject; or
   - An Auth email identity whose **server-only** app_metadata has the exact Memberstack app ID and whose `auth_user_id` and `email` match one service-role-protected `memberstack_handoff_test_accounts` mapping. No `user_metadata`, browser-submitted email/member ID, or JWT role claim is trusted.
3. The independent `memberstack-plan-access` server checks the active 2027–28 Testing Plan, using the existing short (120-second) positive cache and server-controlled membership rule mapping. A valid Supabase session alone never grants access.
4. `demo-students` and `demo-course-planning` revalidate this entitlement on **every** private API request. Only after that do they create a `member_identity_links` record with `verified_source='memberstack_server'` for a handoff account; any conflicting link is rejected.
5. Existing service-only SQL RPCs verify both the link and an active `family_owner` workspace membership. All students/courses are scoped by canonical workspace and 2027–28 year plan. Normal OIDC logins continue along the existing path.

## Migration and tests

Migration: `supabase/migrations/20261117212505_multiple_verified_auth_identities_per_member.sql`. Drop only `member_identity_links_memberstack_member_id_key`, replace it with a nonunique index for lookups. Retain `auth_user_id` primary key, existing RLS and role grants. A rollback-only SQL rehearsal showed 2 different Auth users sharing the same trusted Memberstack member, retaining both original OIDC links; no persistent test link was written.

Regression: `tests/passwordless-family-workspace.test.mjs` and updated `tests/auth-handoff-proof-stability.test.mjs`, run in prebuild. Security validation must confirm `anon`/`authenticated` cannot read or insert identity links, and unauthorized members are still blocked.

## Acceptance before member-facing use

- Merge the PR after CI passes and confirm deployed code matches GitHub sources.
- In the browser profile with the already-verified passwordless session, open `/auth-handoff/`, then choose `Open my students and planning workspace`. Confirm prior Demo students, planned courses and topic selections load as **the same family**, without another password.
- Switch to original Custom OIDC login in a separate browser profile and verify the same workspace records remain; never ask members to expose tokens.
- Test missing/inactive Testing Plan, wrong member, forged token and changed identity mapping to confirm 401/403; verify read/write operations cannot cross workspace IDs.
- Confirm access can be revoked within the documented short entitlement cache window, with no newly granted private access after lapse.
- Only after all checks should the test-only synthetic-account/session model be reviewed for production risks such as email recovery, accidental account linking, impersonation, and long-lived refresh token management.
- Last: replace the manual Console step with a dedicated dashboard-only Webflow script approved by Kathryn; test same-tab iPhone/iPad Safari before release.

No Vercel subscription, Supabase paid custom domain or DNS changes are required for this development work.
