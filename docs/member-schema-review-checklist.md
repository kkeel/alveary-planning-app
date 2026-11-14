# Member schema review — proposed first migration

**Status: review SQL only. No hosted database changes.**

Review file: `docs/sql/member-workspace-foundation-review.sql`. Use the official Supabase CLI to generate a migration name and copy the reviewed SQL into that file when approved. Keep automatic GitHub deployment to production off.

## Scope

- Trusted Memberstack ↔ Supabase identity link, never email-only joins
- Independently owned family and school workspaces; explicit roles
- Separate annual plan per workspace and school year, with catalog release pinning
- Stable student profiles and grade-specific yearly placements
- Subscription entitlements separated from workspace ownership and roles
- Staff preview access independent of member testing plan
- RLS enabled, **zero** client policies and explicit revoke for anon/authenticated

## Decisions deliberately deferred

- Kathryn's family vs school Alveary+ entitlements / school seat rules
- Former-member history access, export and transcript policy
- Verified Memberstack OIDC subject and secure plan reconciliation service
- Who may invite teachers, create workspaces, and which roles can edit school students
- Topic selections/teaching groups, book ownership and outcomes follow in independent migrations

## Required validation before applying

1. Run SQL on isolated Postgres with Supabase-like auth roles and the current catalog schema.
2. Verify the year-pinned composite FK rejects a 2027–28 plan tied to a 2028–29 release; duplicate workspace/year rejected; student cannot be placed in another workspace's plan.
3. Verify anonymous and authenticated clients cannot read or write identity, member, school, family or student tables by default.
4. Confirm school teacher membership never creates family access and a Memberstack membership plan does not itself create workspace membership.
5. Review deletion/revocation behavior; never silently delete annual plans on renewal or expiry.
6. Have staff use only synthetic student names until Memberstack SSO, verified entitlements, RLS read/write policies and role-specific negative tests all pass.

**Follow-up:** establish Memberstack trust chain and SSO; run tests using a family member, school-only teacher, mixed family/school account, basic-only member, expired member, unrelated logged-in user and incognito visitor before building the real Students form.

## Applied and verified — November 14, 2026

The proposed foundation was executed in a rollback-only SQL dry run and validation passed for catalog-year foreign keys, cross-workspace student isolation and browser-role privilege denial. Supabase then applied migration `20261114170421_member_workspace_year_foundation` to **Alveary Planning – Development**. The exact deployed SQL is committed at `supabase/migrations/20261114170421_member_workspace_year_foundation.sql`. Supabase CLI was not available in the session, so the migration version was obtained from Supabase's actual migration history rather than invented.

Post-migration inspection confirmed all eight new tables exist, all are empty, RLS is enabled, none has policies, and neither `anon` nor `authenticated` has SELECT access. Existing 2027–28 catalog records were unchanged.

**Still blocked:** real student creation, member-facing reads/writes, school staff sharing and private Planning access. These require verified Memberstack identity, entitlements, role-scoped policies and adversarial tests. The Supabase advisor now reports an expected informational RLS-no-policy notice for these deliberately closed tables.
