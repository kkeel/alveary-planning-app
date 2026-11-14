# Member planning: identity, workspaces, school years and student continuity

Status: approved product direction for technical design, November 14, 2026. **No private member schema, entitlements or write access is deployed by this document.** The existing 2027–28 catalog snapshot is a separate, immutable dataset. Do not touch live 2026–27 systems.

## Core principles

1. **Memberstack is the identity and subscription source**, not the ownership container for planning data. One Memberstack member may hold basic, Alveary+, school and/or development-testing plans simultaneously. Confirm access from verified server-side Memberstack identity and plan grants; an OAuth session alone does not grant curriculum or private workspace access. Never authorize from editable user metadata, a UI-only badge, a claimed email address, or a simple query parameter.
2. **One sign-in; multiple isolated workspaces.** A single person can access a private family workspace, one or more school workspaces, or both. Workspace membership/role is distinct from subscription entitlements. A school member/teacher sees only the specific school workspace(s) and academic years assigned to them, never the account holder's personal family data. A family plan is private from teachers even when the same person also operates a school.
3. **One workspace-year plan per context and year.** The same family or school may have separate immutable plan identities for 2027–28, 2028–29, etc., each pinned to a release and its selected editions. No rollover updates prior-year selections or silently changes edition IDs. Two years may be active simultaneously during renewal/overlap.
4. **Students persist; grade placements are year-specific.** A student profile belongs to its family or school workspace, while that student's grade/enrollment/active status is snapshotted separately in each school year. Next-year setup can offer to copy names and increment a proposed grade, with review before saving. Never auto-promote grades as an unreviewable side effect, especially for retained/repeated grades, graduations, mixed levels and school grade assignments.
5. **Data retention differs from access.** Expiring membership must not delete family history or edit past plans. A time-limited entitlement controls what can be opened/edited/downloaded in the current period, separately from the stored data. The exact former-member history, transcript-access/export and renewal policy is a CMI decision pending review; don't promise indefinite member access or automatic deletion.
6. **Plan choices are topic aware.** The chosen combined-course edition implies all linked topic editions initially, with member-owned per-course exclusions. Preserve originating edition, actual selected topic edition, student placement(s), and possible shared teaching groups. Official combined/topic PDFs remain fixed; member customization does not assemble new PDF content.
7. **Transcripts later.** Model completed study separately from intended plan and schedule, with per-year course enrollment and eventual completion/credit/grade evidence and provenance. Historical course titles/release references must remain interpretable even after the curriculum rotates.
8. **Optional Students setup.** Home overview order: Add students → Choose courses → Build a schedule → Organize books → Prepare supplies. Browsing/Think Tank must work without adding students. Students page is preview-only until private authorization is implemented.

## Proposed relational boundaries (not yet migrations)

- `member_identity_links`: trusted Memberstack member ID ↔ Supabase auth identity. Account email is display/contact only; verified member ID is the join key.
- `workspaces`: `family` or `school`, internal workspace ID, not an email/Memberstack plan ID. One personal family workspace per account in first release, design for multiple authorized adults.
- `workspace_memberships`: user ↔ workspace ↔ role (family owner, school admin/teacher, future guardian). Explicit role-scoped access, grant/revoke and auditing. School workspace membership must not imply family membership.
- `member_entitlements` and `developer_preview_access`: verified Memberstack subscriptions/plan IDs with product surface, workspace type, school year, expiry, and freshness/renewal status; a separate staff-preview allowlist independent of members' testing dashboard plan. Memberstack plan may have no matching workspace and vice versa.
- `workspace_year_plans`: workspace ID, school-year ID, selected catalog release ID and plan stage; unique within workspace/year only, so other years remain separate. Schools may add teacher/class grouping separately.
- `students` and `student_year_placements`: workspace-owned stable student profile; separate year-plan grade and enrollment fields, with permissions for their specific workspace. School and family representations must not be silently merged merely by matching names.
- `plan_course_selections`, `plan_topic_selections`, `student_topic_assignments`, `teaching_groups`, and `teaching_group_members`: exact catalog edition IDs; distinguish a student's grade-level course context from shared instructional delivery. A topic repeated in several courses must not be double counted automatically. Make grade-level associations explicit.
- `household_resource_preparation` / `workspace_resource_preparation`: one canonical resource+format ownership/preparation record for a workspace, with many source course/topic assignment links and explicit quantity when needed; books do not duplicate solely because students share a topic.
- Later `student_course_outcomes` / `student_transcript_entries`: year-specific completed-work snapshots and credit metadata; never equate bookmark, assignment or planned schedule with earned credit.

All workspace-owned tables must use scoped foreign keys and RLS. Deny access by default. Validate both SELECT and write paths, cross-workspace IDs, former members, prospective users, school teacher roles and direct REST requests; do not treat permission checks in the Next.js client as enforcement.

## Year rollover behavior (design, not implemented)

- A 2027–28 plan is retained and pinned to its approved 2027–28 catalog release.
- A new 2028–29 plan is created separately and pinned to a 2028–29 approved release. Student profiles may be reused only within the same workspace, with reviewed new-year grade placements; no automatic copying of selected courses or schedules.
- Offer an optional "Start from last year" assistant later, with explicit confirmation and source attribution; resolve new editions against approved releases rather than silently rebinding historical links.
- A year selector shows only workspaces and years permitted by verified identity and entitlement, distinguishing planning/editable access from historical read/export and transcript availability.

## Alveary+ and school licensing — unresolved Kathryn decision

A member may hold any combination of basic, Alveary+ and school memberships. **Do not assume** that a member's Alveary+ entitlement covers both a family and a school, nor that school Alveary+ automatically covers teacher household planning. Obtain Kathryn's rule on separately paid family/school Alveary+ rights, teacher roles/seats, billing and renewal before writing final entitlement mappings. The schema must support grants scoped by workspace kind, specific workspace, school year and product capability so either decision is possible without redesign.

## Login, verification and staff test matrix

Observed in prior November 11–12 troubleshooting: custom Memberstack OIDC initially errored because Supabase did not receive an email; `openid, email, profile` scopes were added. A setting permitting unverified provider emails enabled one successful sign-in, but other tests still presented Memberstack authorization and Supabase verification emails; `over_email_send_rate_limit` also occurred. The planning app uses `custom:memberstack`, browser-side Supabase Auth and a `?connect=1` launch on specific Webflow dashboard links. The UI currently signs out **only from the planner**. Successful login is not proof of a paid plan.

Before opening private data:
1. Confirm Memberstack Custom SSO **Skip login for members already signed in on your site** and **Skip authorization screen**, site URL pointing to a valid Memberstack-loaded Alveary page. Test with signed-in and signed-out users, fresh browsers, mobile and incognito. A brief provider redirect may occur, but no second login/consent screen is the UX target.
2. Inspect current Supabase custom OAuth email-verification settings and Auth logs. Do **not** send Supabase signup/confirmation emails to people already signing in through verified Memberstack OIDC; verify the provider's email/identity trust requirements with an actual test before adjusting settings. Do not disable all account security blindly or store secrets in public app variables.
3. Align production planner's `plan.alveary.org` URL and approved callbacks/redirect allowlists; don't rely on old GitHub Pages URLs. Test account-to-account switches, logout policy, and renewal/expiry.
4. Require a server-side authenticated member ID crosswalk and verified subscription grants before fetching member-only data. Use a separate staff preview allowlist; a staff tester need not buy or be added to a special Memberstack testing subscription.
5. Test authorized family member, member with school workspace role, basic-only, Alveary+-only, school-only, mixed plans, no membership, expired membership, and direct unauthenticated URL/API calls. Verify public Course List behavior is deliberately separate from personalized Planning tabs and private Students/My Plan views.
6. Coordinate school testing without exposing staff/test-household data or production student information. Create only synthetic test student profiles until both RLS and member identity checks pass.

## Current implementation status

The active development database has published-to-staging catalog tables, but no workspace/member/student planning tables yet. Catalog RLS has no member-facing policies; Memberstack sign-in tests are only identity tests. The Students route added with this document is an intentionally public-safe placeholder, **not** a student-creation form or a secure account portal. Private schema migrations, staff authorization, plan locking and auth settings changes still need separate review and tests.
