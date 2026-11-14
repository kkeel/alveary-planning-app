# Demo family workspace + saved Students

## Scope

This is the first private **saved data** feature for the 2027–28 Demo Planning App. It does not change live Webflow, Memberstack login, real-year member plans or existing browser-local Course Think Tank selections.

- Eligible member signs into the planner via Memberstack Custom SSO and must have an **ACTIVE** Memberstack Testing Plan (`pln_testing-plan-vybk04zq`) for Demo 2027–28.
- Only on entering Students, `demo-students` creates or reuses a deterministic, Memberstack-identity-bound **family workspace**, active `family_owner` membership, Demo 2027–28 year plan, and member identity link.
- Students can be added with **name/nickname** and optional Grade (Kindergarten to 12), edited, or **archived**; no dates of birth or other sensitive personal information collected.
- Student names are stored in `students` (family scope), grades in `student_year_placements` (year-specific). Archived students remain in the database but are hidden from the active Students list.
- The `workspace_year_plans` row uses `plan_kind='demo'` even though it references the same 2027–28 draft curriculum release; `plan_kind='member'` is a distinct, future record.
- **Existing Course Think Tank picks remain browser-local.** No browser localStorage writes are changed by this feature and no automatic import or destructive migration is done. Course-to-student assignments and saved course selections are the next feature.

## Authorization and privacy

`supabase/functions/demo-students/index.ts` is deployed with `verify_jwt=true` and checks the caller Supabase JWT through Auth Admin. **Every** operation also calls the current `memberstack-plan-access` function with the user JWT, which validates the server-side Memberstack API identity, LIVE active plan connection, enabled year-specific rules, and returns `access=demo`. It does not trust browser-supplied member IDs, plan IDs, workspace IDs or claimed authorization.

The function uses only its **server-side** Supabase secret/service key to read/write a workspace derived from the **trusted Memberstack Custom OIDC subject**. The member ID is matched to `app_clbb9rspy00160ujl6tsxbsrj`. A verified identity cannot access another workspace by supplying a different ID; the API does not accept a workspace identifier from clients.

Database migration `20261114215305_demo_student_server_permissions` grants only `service_role` the necessary operations on existing private tables and the curriculum release lookup. `anon` and `authenticated` remain denied by RLS and lack direct table permissions; do not add permissive policies to work around function failures.

`member_identity_links` uniquely binds an Auth UID and Memberstack member ID. If an auth account is deleted/recreated, the old identity link must be reconciled by an administrator; never silently transfer private workspace ownership based solely on a browser request. Identical Memberstack identities derive the same deterministic family workspace ID.

## Manual acceptance tests

1. With active Testing Plan, open `https://plan.alveary.org/?connect=1` and navigate to **Students**. The page should show an empty private workspace (unless students were already added).
2. Add a *test student* with a name/nickname and a grade; edit name and grade; refresh; sign out/in and visit again; check persistence.
3. Open an independent browser/incognito signed into the same Memberstack account; verify the same student record is loaded.
4. Archive the test student; confirm it disappears from the active list but remains stored in the database (with `archived_at` populated). Do not use a child's real full name in testing if unnecessary.
5. Sign out; confirm Students is not visible and a direct `/students` URL shows only public-safe messaging. Members without an eligible Testing Plan should receive no student data (API rejects them).
6. Temporarily remove Testing Plan access (when appropriate) and recheck; server requests must fail closed even if the UI was loaded before revocation.
7. Verify the course bookmarks/Think Tank remain unchanged in the same browser.

**Note:** The initial function deployment and static Next.js build alone cannot prove successful private operations; a real authorized browser request plus database/log checks is required. Do not claim the whole workflow production-ready until this positive and negative testing passes.

No real member 2027–28 plans or student records are imported or modified by this development feature.
