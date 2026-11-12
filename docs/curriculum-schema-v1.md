# Proposed Supabase schema v1 — 2027–28 planning foundation

**Status:** design review; no SQL has been run and no curriculum or household data has been copied.  
**Authoring source:** Airtable **Curriculum Planning** (`appzITUxxmM6cO5m1`).  
**Serving destination:** Supabase **Alveary Planning - Development** (`fzitmrzuxxdmvrhftdkr`).  
**Code:** `kkeel/alveary-planning-app`; current 2026–27 pipelines are explicitly out of scope.  
**Companion:** [Curriculum publishing contract](curriculum-publishing-contract.md).

## Verified source inventory (November 12, 2026)

- 1,145 Curriculum Plans: 564 Topic, 179 Single-Topic Course, 402 Combined Course.
- 1,153 Lesson Plan Editions. **385** are tagged for 2027–28. Among those, **377** are **Next Publication Status = Primary**, six Reserved, and two Retired. These 377 are **candidates**, not certified complete/approved releases.
- Other figures recorded by the existing publisher contract: 560 Resource Assignments, 590 Supply Assignments, 107 Scheduling records, 12 draft Sample Schedules, and 162 Sample Schedule Placements. Recount during extraction.
- The Supabase development project's `public` schema currently has **no app tables**, its migration list is empty, and the repository contains only a starter `supabase/config.toml` and `migrations/.gitkeep`.

## Fundamental boundaries

1. **Airtable authors curriculum.** Supabase serves approved, versioned snapshots. A successful extraction is not approval for member publication.
2. **Use immutable Airtable IDs**, including each native record ID and the available `Plan ID`, `Edition ID`, assignment IDs, and supply/resource IDs. Labels and display titles are never join keys.
3. **Do not merge course, topic and edition identities.** Curriculum Plan is the long-lived concept; Lesson Plan Edition is a particular publishable version.
4. **All edition-specific content is release-scoped.** Store `release_id` on dependent rows and enforce same-release foreign keys. A family plan is pinned to the release it selected until deliberately migrated.
5. **Public browsing is not the same as membership.** A signed-in Supabase account is not automatically entitled to 2027–28 material. Memberstack year-specific entitlement and developer preview authorization need server-side verification.
6. **No secrets or protected resource URLs in GitHub JSON or a public table/view.** Separate protected destinations and examinations from public metadata.
7. **Avoid live 2026–27 sources.** Do not alter the existing `course-picker`, `lesson-print-preview`, Master Curriculum legacy tables, or active pipelines as part of this schema.

## Phase A — Versioned catalog tables

The table names below are proposed implementation names, not existing tables. Each snapshot table includes `release_id`, its immutable source record ID, and ingestion metadata. Keys should be release-aware and indexed for common grade/subject/rotation/country queries.

| Proposed table | Airtable source | Required fields and relationships |
|---|---|---|
| `catalog_releases` | Publication workflow | UUID, publication year, rotation, channel (staged/member-approved), revision, lifecycle status, validated/approved/published timestamps, source checksum and report |
| `catalog_active_releases` | Publication workflow | One active approved `release_id` per year/channel; promotion updates only this pointer transactionally |
| `catalog_subjects` | Subjects | Source ID, label, sort order |
| `catalog_grades` | Grades | Source ID, grade number/title, suggested morning minutes |
| `catalog_plans` | Curriculum Plans | Plan ID and source ID; type: Topic / Single-Topic Course / Combined Course; display title, subject ID, country, rotation/cycle, status, descriptions, combining/placement tips and display order |
| `catalog_plan_grades` | Curriculum Plans → Grades | Plan and grade link for every allowed grade; never flatten to a single grade string |
| `catalog_plan_rotations` | Curriculum Plans → Rotation(s) | One row per R1/R2/R3/R4 applicability |
| `catalog_editions` | Lesson Plan Editions | Edition ID/source ID; plan ID; edition display title/override; years; writing/review state; current/next publication role; country, focus terms, notes needed for member planning |
| `catalog_edition_topics` | Connected Topic Editions | Specific parent **course edition** → specific **topic edition**, explicit sequence/term/order, shared-topic context; no cross-release foreign keys |
| `catalog_resources` | MA Library | Canonical Resource ID, title, author, type, ISBN/ASIN, image, public rationale, availability, non-protected purchase metadata |
| `catalog_resource_assignments` | Resource Assignments | One row per **source assignment ID** with exact edition ID, role, `Choose One` selection rule, optional flag, display order, term applicability, and rationale/notes; **do not assume a single resource ID** |
| `catalog_resource_assignment_items` | Resource Assignments → Resource (linked records) | Ordered junction rows associating each source assignment with **all** linked resource IDs; one ordinary item or multiple choices under the same assignment ID |
| `catalog_supplies` | MA Supply Library | Canonical Supply ID, name, quantity hints, location, rationale, public links, household flag |
| `catalog_supply_assignments` | Supply Assignments | Assignment ID, exact edition ID, supply ID, quantity override, optional/group/household flags, choice grouping and term applicability |
| `catalog_scheduling` | Scheduling | Scheduling ID, `WK`, `WK+`, `MIN`, `MIN+`, `*/_` recommendation, `TEACH`, optional grade band and note |
| `catalog_edition_scheduling` | Lesson Plan Editions ↔ Scheduling | Preserve reusable and multiple scheduling recommendations for an edition |
| `catalog_sample_schedules` | Sample Schedules | Sample ID, grade, rotation, publication year, status, suggested time and notes; Draft must not appear as an approved member example |
| `catalog_sample_placements` | Sample Schedule Placements | Placement ID, sample ID, exact edition ID, optional course-level context and scheduling ID, day, morning/afternoon section, position, note |
| `catalog_protected_links` (private schema) | MA Library and later lesson packets/exams | Internal link metadata and destinations, never exposed to anonymous requests; delivered only after an explicit authorization check |

**Not every column above should be exposed by the Data API.** Use separate public-safe views or carefully scoped API access. All tables in exposed schemas must have explicit RLS; a bare `TO authenticated` policy is not sufficient authorization.

### Edition-to-topic composition requires a source decision

Airtable's `Connected Topic Editions` is a self-link and indicates *which* specific topic editions are used. It is not yet a verified, authoritative ordered packet composition contract. Before writing the publisher, confirm where term/sequence/interleaving order comes from, and add a deliberate order field or junction source if necessary. Validate zero-, one-, and multi-topic shapes. Do **not** force Single-Topic Course editions to have a child topic.

### Assignment ownership is different from preparation ownership

The **catalog** preserves every book/supply assignment separately because a resource can have different roles, terms and notes in different courses. **Member preparation** can be tracked once per household, canonical resource and chosen format, while retaining the separate edition assignments that explain why the family needs that item. Do not let bookmarking the same book in two different courses create duplicate book purchases by default.

## Phase B — Private member planning tables (after identity contract)

| Proposed table | Purpose |
|---|---|
| `member_identity_links` | Trusted server-verified Memberstack member ID ↔ Supabase user ID; no authorization based on editable user metadata |
| `member_entitlements` | Publication-year grants, allowed release channel, effective/expiry dates, source and reconciliation status |
| `developer_preview_access` | Explicit independent developer allowlist; free Memberstack test plan alone does not confer curriculum access |
| `households`, `household_members`, `students` | Private family records with server-enforced household ownership and sharing |
| `family_year_plans` | Household, publication year, selected approved catalog release, country and other plan-level preferences |
| `student_course_selections` | Student, year plan, exact edition ID and optional combined-course context; persist user choices separately from catalog |
| `household_resource_preparation` | Canonical resource, format (physical/audio/etc.), obtain/own/prepare status, optional notes; reusable across student selections |
| `household_supply_preparation` | Canonical supply, household status, quantity needed/owned, notes |
| `member_schedule_placements` | Family/student, edition and optional course context, day, section morning/afternoon, sort position, customized minutes; schedule board is the source of truth |

Identity, year access, and household RLS must be verified using distinct public, active-member, former-member, unauthorized free-plan, and developer accounts before storing real member choices.

## Phase C — Pipeline and validation

1. Read **all** scoped source records from Curriculum Planning Airtable (read-only), including explicit links and statuses.
2. Build source-ID crosswalks; check duplicates, absent required IDs, missing parent relationships, and broken edition references.
3. Resolve 2027–28 eligible edition roles from **Next Publication Status**, not from current status or year tags alone.
4. Validate all three plan types, course→topic ordering, topic sharing, resource/supply choice groups, scheduling variants and sample-schedule status.
5. Classify every field and URL as public, entitled, protected, or internal. Reject protected links leaking into public payloads.
6. Stage the complete release in transaction-safe batches. Emit machine-readable validation/errors/warnings/counts.
7. Require manual approval of the full release and security tests.
8. Promote a single active-release pointer atomically. Failures leave the prior approved release untouched.
9. Record the Git commit/source revision, source timestamp, validation report, and approval event.

## First migration — review gate

After approving this map, create the initial migration with the current Supabase CLI `migration new` command and commit it to this repository on its own branch. Start with release metadata + subjects/grades/plans/editions and closed-by-default RLS; add assignment/scheduling tables in reviewed follow-on migrations. **Do not enable GitHub integration's Deploy to production switch yet.**

Prior to any member-data exposure, review Supabase's security advisor finding about the current `public.rls_auto_enable()` SECURITY DEFINER event-trigger function being executable by `anon` and `authenticated`; restrict execute grants with a reviewed change. Also check Auth leaked-password protection, considering plan availability.

## Airtable cross-check — November 12, 2026

Read-only review against the entire current Curriculum Planning table datasets, not only a few selected examples:

- **Plan kinds:** 564 Topic plans, 179 Single-Topic Course plans, and 402 Combined Course plans. Of the **377** 2027–28 editions with `Next Publication Status = Primary`, **193** belong to Topics, **81** to Single-Topic Courses, and **103** to Combined Courses.
- **Combined course links:** Every one of those 103 Primary combined-course editions has at least one linked topic edition; **101** have multiple and **two** have one. Keep the one-topic shape valid but review its editorial exception or warning. **One** of the 81 Single-Topic Course editions also has a linked child: a special case to retain and flag, not silently reinterpret.
- **Cross-year anomaly to review before publishing:** `History: Grades 2-3 (U.S.) · R4 · Edition 2027-28` (`recDXCab1DPjjOkRe`) links through `Connected Topic Editions` to its own plan's **2023–24 retired edition** (`recFgAWlUbSILyzaV`). That child is **not** tagged 2027–28. Do not auto-publish the retired child, self-repair it, or discard the relationship. Record a blocking validation finding for editorial resolution.
- **Resource assignment cardinality:** Across all **560** Resource Assignment rows, **543** link to exactly one Resource. **17** link to multiple Resources (**14** with two choices and **three** with five choices); **all 17** have `Choose One = true`. This is a single assignment containing multiple *alternatives*, not 17 standalone grouping identifiers. The resource-assignment-items junction above is essential. Do not silently expand an alternative into multiple required books.
- **Supply assignment cardinality:** All **590** Supply Assignments currently link to exactly one supply, and none has `Choose One = true`. Preserve the existing assignment context; allow a future extension if supplies gain alternatives.
- **Readiness distinction:** The **377** selected Primary editions are currently spread across writing statuses `Not Started` (13), `Create Tracker` (56), `Set Up` (114), `Waiting on Topic(s)` (84), `Needs lesson block header update` (108), and `Copy/Paste from Previous Year` (2). **None** is currently `Ready to Publish`. Thus `Primary` identifies intended edition selection, not an editorial sign-off. The publisher must require a separate approval gate for member visibility.
- **Sample schedules:** All **12** current sample schedules are still Draft; never expose these as approved public/member examples solely because a publication year is selected.
- **Ordering is not certified:** Linked `Connected Topic Editions` values identify composition but do not, on their own, provide an approved term-by-term **lesson interleaving** sequence. Keep explicit ordered composition fields in Supabase. Treat any Airtable linked-record order as *provisional presentation order* unless CMI confirms it as authoritative; packet ordering may require a later authoring junction or separate configuration.
- **Review principle:** These findings are **data quality and editorial-publishing gates**, not a reason to delay creating foundational catalog/release tables. Implement fail-closed validators before importing/publishing the first approved release.

## Decisions and blockers to resolve before the first full publish

- **Ordering authority:** exact topic/term composition order for combined course editions.
- **Approval authority:** which Airtable fields/staff action certify a 2027–28 edition for publication, beyond `Next Publication Status = Primary`.
- **Resource choices:** whether `Choose One` groups are distinguishable with a stable source ID or need a new grouping field.
- **Identity synchronization:** Memberstack webhook/server reconciliation and publication-year entitlement freshness.
- **Protected content:** member-only resource URLs, lesson packets, examinations, and later PDF delivery policy.
- **Country/rotation:** enforce and test both US and Canada variants and shared all-rotation records.
