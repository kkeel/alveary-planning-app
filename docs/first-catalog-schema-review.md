# First Supabase catalog schema — review checklist

**State:** official [Supabase CLI-generated migration](../supabase/migrations/20261113114606_catalog_foundation.sql) committed to this PR and validated against a disposable PostgreSQL 17 database in GitHub Actions. The original [SQL review draft](sql/catalog-foundation-review.sql) is retained for comparison. **The migration has NOT been applied to hosted Supabase.**

**Target:** Supabase **Alveary Planning - Development** (`fzitmrzuxxdmvrhftdkr`). Existing production app, Airtable records, and GitHub Actions pipelines remain unchanged.

## Scope of this first schema slice

Fourteen closed-by-default catalog tables covering:

- Frozen curriculum releases, publication-year/surface/audience routes, subjects, grades
- Curriculum Plans and their subject/grade/rotation relationships, preserving Airtable `Plan Sort` as **text**
- Lesson Plan Editions, year-specific intended publication roles, and specific linked Topic Editions
- Planning Choice Groups, their **explicit display grades**, and the linked course options

The migration intentionally **does not** create household/student/member data, resource/supply tables, packet content, PDF URLs, or direct user permissions. Those come as reviewed follow-up migrations.

## Rules preserved from the approved design

1. **Year overlap:** 2026–27 and 2027–28 may be available concurrently on different surfaces during February–June 2027; no global `current_year` switch.
2. **Publication roles vs availability:** Airtable `Current Publication Status` and `Next Publication Status` become year-specific snapshot roles. The app does not automatically expose them when they are `Primary`.
3. **Order:** `catalog_plans.plan_sort` stores the exact source text, used as the primary key in course ordering, followed by context-specific keys and source IDs.
4. **Course/topic:** Every edition refers to a plan, and combined course editions can refer to specific topic editions in the same release; shared topic editions stay canonical.
5. **Choice groups:** The actual single Airtable `Planning Choice Groups` table is the authoring source. Linked `Curriculum Plans` become rows in an internal junction; no additional Airtable table required. The explicit grade link (currently labeled `Course Grades (Reference)`, field ID `fld2LjPhcSf3vBgMm`) controls display, not the misleading first-course grade lookup.
6. **No forced choices:** The schema imposes no exclusive-selection constraint. A family may include multiple science/math/language courses, and books remain independently selectable.
7. **No duplicate list:** At app-query time, all courses linked to Active groups for a specific publication year are subtracted from standalone course rows; they appear only in applicable grade-specific choice groups, even if represented in multiple groups.
8. **Secure by default:** All 14 tables have RLS enabled and **revoke all** privileges from `PUBLIC`, `anon`, and `authenticated`. No access policies are provided yet, so even developers will use server-authorized tooling to load test data until we finish identity/entitlement design.

## Important implementation checks before any database apply

- GitHub Actions ran pinned **Supabase CLI 3.1.0** and generated the official filename with `supabase migration new catalog_foundation`: `supabase/migrations/20261113114606_catalog_foundation.sql`. The file is now committed. **Do not generate a duplicate migration.**
- Use CLI `--help` and inspect the v3 breaking changes before deciding local/remote flags. Do **not** turn on automatic Supabase production deployment.
- **Completed:** the committed migration ran successfully in an isolated PostgreSQL 17 GitHub Actions service. Checks verified 14 tables, RLS on all 14, no anon/authenticated table DML grants, cross-year foreign-key rejection, and Advanced Nature Study in two grade-specific groups. **Not yet tested** against a fully local Supabase stack or the hosted development project.
- Confirm later publisher validation: choice group linked options are strictly `Combined Course` or `Single-Topic Course`, not `Topic`; course options resolve to a Primary edition for the correct year; Active groups have explicit display-grade coverage for their grouped courses; no duplicate standalone listings.
- Confirm the anomalous 2027–28 History Grade 2–3 US edition's link to the retired 2023–24 edition gets an editorial validation failure before promotion. Do not silently drop or repoint it.
- Before publication, add a transaction-safe route promotion procedure that checks the **referenced release itself is validated and approved** (not just a route's `approved_at`); check the current metadata table alone is insufficient.
- Before user-facing access, fix the existing Supabase security warning on `public.rls_auto_enable()` (an exposed SECURITY DEFINER function), then recheck security advisors and test year-specific entitlements.
- Add negative tests proving `anon` and `authenticated` cannot read or modify any new table, including through RPC/views; grant later public/member reads only after reviewing RLS and protected link policy.
- Any migration should be reviewed in GitHub separately from its deployment, and applied **only to Alveary Planning - Development** at first.

## Acceptance milestones

1. **PR review:** Check that the official migration, CI tests and schema match the approved design. Confirm no unintended live app changes.
2. **CLI migration generation:** Complete; generated by CLI 3.1.0 in GitHub Actions and committed in this PR.
3. **Isolated PostgreSQL check:** Passed on PostgreSQL 17 with 14-table/RLS/composite-key test coverage. Further Supabase-specific security tests remain.
4. **Development database deployment:** After PR approval, apply to the explicit development project and verify tables/migration history/advisors through Supabase.
5. **Next data work:** Implement read-only Airtable extraction and validation report, then add books/supplies/scheduling in subsequent migrations.

See [the approved curriculum schema](curriculum-schema-v1.md) and [publishing contract](curriculum-publishing-contract.md) for details.
