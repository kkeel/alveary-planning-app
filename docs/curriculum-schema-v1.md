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

## Confirmed product rules — November 12, 2026

### Plan Sort is the primary curriculum order

The actual Airtable `Curriculum Plans.Plan Sort` is a calculated **text** sort key combining subject and other course/grade/rotation/cycle order terms. `Lesson Plan Editions.Plan Sort` looks it up from the plan; resource/supply assignments also inherit it. Preserve the exact string as `plan_sort` (with consistent text collation), **sort by it first in all default curriculum lists**, then apply any view-specific secondary ordering (`Term Sort`, `Display Order`, grade/term/day/position, etc.) and stable record ID tie-breaks. Do not coerce `plan_sort` to a number: it can contain a hyphen and leading zeroes. Option-group presentation may visually bracket adjacent choices but must not silently replace canonical `Plan Sort`. Chronological lesson-number/packet interleaving is a different, explicit sequencing concern.

### Soft course recommendations, never forced exclusivity

CMI wants **guidance, not enforcement**. Members should see "Suggested: choose one" for families considering multiple mathematics pathways, Spanish/French, Latin independent vs video/live-supported versions, and high-school science options. They may choose none, one, or **more than one**. No mutually exclusive radio control, automatic deletion, database uniqueness rule per choice group, or forced-selection validation.

The Curriculum Planning base now includes **one actual authoring table: `Planning Choice Groups`** (verified November 12, 2026). No separate Airtable `Planning Choice Options` table is needed for the currently requested behavior: its multi-link `Curriculum Plans` field owns the choices, and Supabase can normalize those links into `catalog_course_choice_options` rows during publication. Only add a source option-junction table later if option-specific metadata becomes necessary.

**Verified fields:** `Choice Group` (primary text); `Group ID` (`RECORD_ID()`); `Curriculum Plans` (multiple links); `Subject` (lookup); `Grade(s)` (lookup); **`Course Grades (Reference)` (direct multiple link to Grades; stable Airtable field ID `fld2LjPhcSf3vBgMm`; this is actually the explicit group display-grade filter)**; `Guidance Message (opt)` (rich text); and independent **`Current Publication Status`** / **`Next Publication Status`** selects (`Draft`, `Active`, `Retired`). For the 2026–27 vs 2027–28 publishing cycle, current vs next resolves to the intended year and is frozen with the release. Don't use rotation to control group visibility.

**Critical grade rule:** Airtable field `fld2LjPhcSf3vBgMm` (currently labeled `Course Grades (Reference)`) is the **explicit display grade assignment**. It—not the course eligibility grade(s) or the `Grade(s)` lookup—decides whether a recommendation appears for a grade. The `Grade(s)` and `Subject` lookup fields currently take **only the first linked Curriculum Plan** (`recordLimit: first 1`), so they are informational and never reliable as eligibility or group membership rules. For clarity, rename `Course Grades (Reference)` to **`Show Choice in Grade(s)`** (its current values determine where the group is displayed), and rename the **`Grade(s)` lookup** to **`First Linked Course Grades (Reference)`** or hide it. Airtable field IDs remain stable across a rename; neither rename has been performed.

**Verified four test records:** `Latin Choices: Level 1` (display Grade 7; links Latin 1 Independent Study and Video), `Latin Choices: Level 2` (display Grade 8; links Latin 2 Independent Study and Video), `Science Choices: Grade 9` (Chemistry and Advanced Nature Study), and `Science Choices: Grade 10` (Biology and Advanced Nature Study). All seven distinct linked plans are `Single-Topic Course` or `Combined Course`, not `Topic`, and their known editions are marked Next Primary for 2027–28. Both Science groups deliberately reuse the **same** Advanced Nature Study Curriculum Plan without cloning it; choosing it in different grade contexts should still resolve to the canonical edition and member selection identity.

**Course-only rule:** Validate that every linked Curriculum Plan has `Plan Type = Single-Topic Course` or `Combined Course`. Never link a `Topic` as an option. Each course's topic content continues to come from its own edition's `Connected Topic Editions` and is not duplicated or reparented into the choice group. A filtered Airtable course-only view can help authors avoid accidental topic links.

**Grade-specific option sets:** Since science options vary by grade, use separate group records per grade rather than a single all-high-school group that would surface Biology in Grade 9 because another course applies there. If a group genuinely shares exactly the same options across several grades, multiple linked Grade records in `Course Grades (Reference)` are fine. In all-grades views, retain the grade contexts and allow repeated **presentation** of a shared course without duplicating its catalog identity or member selection. UI treatment can be refined later; prefer light visual grouping inside the Plan Sort-driven list over a separate forced-choice workflow.

**Group-only placement rule (required):** For each publication-year release, build the set of all eligible course-level Curriculum Plan IDs linked to **Active choice groups for that year**. A course in this set is never independently emitted in the ordinary Course Explorer course list; it appears **only inside its eligible group(s)**. The ordinary list is the set difference: eligible courses **minus all courses participating in Active year-specific choice groups**. Render each matching group once per applicable grade context (using `Course Grades (Reference)`) and its linked courses in `Plan Sort` order. If a canonical course belongs to multiple groups, show it inside **each matching group** (e.g., Advanced Nature Study in Grade 9 and Grade 10), but never output a duplicate standalone row. Treat repeated appearances as presentations of **one** canonical plan/edition and one underlying member selection identity; do not copy the course or its topics.

**Filter-edge safeguard:** A group-linked course must not leak into the ordinary list when its group is not shown under the current grade filter. If it is otherwise eligible for the filtered grade but *no Active group for that release covers the grade*, flag a **choice-group coverage warning** in publishing QA for editors to resolve (e.g., add a Grade 11 group, amend `Course Grades (Reference)`, or deliberately decide to remove course from grouping). Do not silently show it as ungrouped or create an inferred group. When no Active group links a course in that **publication year**, it can be a normal standalone course for that year.

**Ordering:** Continue to use `Plan Sort` as the primary key for items and within groups. Anchor each group in the overall list at the earliest `Plan Sort` among its currently displayed options, and apply a deterministic group-ID tie-break. The group is a light list division, not a separate catalog or a preference ranking. This may pull grouped options together visually; retain every item's original `Plan Sort` value for other views and comparison.

On the client, surface contextual choice guidance in Course Explorer/list/planning/compare views, allow "Add to my plan" for every option, and optionally explain a multi-course selection **without blocking it**. A course can participate in multiple grade-specific groups.

For **books**, an assignment tagged `Choose One` likewise means *recommended one*, not *maximum one*. All linked items remain selectable individually and together, and preparation ownership stays at household/resource/format level.

### Year overlap and per-surface rollout

CMI's source field semantics:

- `Current Publication Status = Primary`: the edition intended to be live **for the current 2026–27 offering**.
- `Next Publication Status = Primary`: the edition intended for **2027–28**, whether or not its lesson plans have been finalized.
- The fields are **authoring selection roles**, not release approvals, permission grants, or permanent snapshot identifiers. When the cycle advances, capture a frozen edition-year-role snapshot before repurposing `Current` and `Next` for another year.

The February–July 2027 overlap is deliberate:

| Window | 2026–27 | 2027–28 |
| --- | --- | --- |
| Until Jan 31, 2027 | Live existing curriculum and lessons | Developer-only preview |
| Feb 1–May 31, 2027 | Existing curriculum and lessons remain available | **Member-facing planning**: courses, book choices, scheduling; new lessons/exams still gated |
| Jun 1–Jun 30, 2027 | Existing curriculum and lessons remain available | Planning plus approved supplies, lesson plans, and exams |
| From Jul 1, 2027 | Retire from ordinary current-year entry points; separately decide archival/prior-year access | Current member year |

**Never model "live" as one globally current year.** In Supabase, an immutable release snapshot is the content; a publication route points to a specific **year + feature surface + audience** combination with start/end times. Separate routes can point to the same immutable snapshot and **both publication years** can be simultaneously available. Enforce year-specific entitlements/server authorization on protected routes, and let the app/member dashboard make the year context unmistakable.

For the 2026–27 overlap **do not assume we must migrate all live legacy data into Supabase**: the existing `planning.alveary.org` can continue to serve 2026–27, with an explicit year link or member dashboard navigation to the new 2027–28 planner. Plan for multiple Supabase years in future, but keep the current app untouched until a reviewed cutover. Do not prematurely deactivate 2026–27 lesson packets when 2027–28 planning launches.

Publishing steps: extract and validate a **development snapshot** → preview internally (with developer allowlist) → review and approve the **planning-catalog** route for Feb 1 → review and approve the **restricted content** routes for June 1 → retain older approved snapshots and audited publication route history; changing Airtable `Current`/`Next` alone never repoints member routes.

### Acceptance tests to add before launch

- Multiple math choices remain selectable together; Spanish and French both allowed; both Latin delivery choices allowed; two high-school science courses can coexist in the same student's year plan.
- No grouped course appears again as a standalone row in the **same publication-year Course Explorer**. In multi-grade views, the shared Advanced Nature Study course appears within each applicable grade choice group but nowhere outside them. Unlinked courses retain their ordinary list placement.
- If a grouped course is eligible for Grade 11 but only grouped for Grades 9 and 10, the publisher warns about the uncovered grade; the app does not silently emit it as an ungrouped fallback. Draft/Retired group links do not suppress ordinary courses in a different publication year.
- `Choose One` book group supports both linked books and no selection, with no forced purchase/preparation action.
- Default course/topic/resource lists preserve `Plan Sort` primary order across all grades, rotations and US/Canada contexts; secondary keys behave as expected.
- At Feb 1, 2027, 2027–28 planning appears to eligible members while 2026–27 lessons remain accessible. On Jun 1, 2027, approved 2027–28 lesson material becomes available without losing the 2026–27 path. On Jul 1, legacy availability follows the agreed retirement/archive policy.
- Unfinished lesson writing does **not** block authorized viewing of approved planning metadata; restricted lesson plans do not leak through direct URLs or public static artifacts.
- Failed validation or publication leaves both years' currently approved routes and snapshots untouched.

## Phase A — Versioned catalog tables

The table names below are proposed implementation names, not existing tables. Each snapshot table includes `release_id`, its immutable source record ID, and ingestion metadata. Keys should be release-aware and indexed for common grade/subject/rotation/country queries.

| Proposed table | Airtable source | Required fields and relationships |
|---|---|---|
| `catalog_releases` | Publication workflow | Immutable source snapshot/revision with year, rotation, validation state, source checksum/report, creation timestamp, review and approval events. Do not treat source `Primary` flags or writing status as equivalent to member publication |
| `catalog_release_routes` | Publication workflow | **Multiple simultaneous routes**, keyed by publication year + content surface + audience/channel, with selected `release_id`, visibility window, approval, and optional legacy-app destination. Promote one route atomically; do not assume exactly one live publication year |
| `catalog_subjects` | Subjects | Source ID, label, sort order |
| `catalog_grades` | Grades | Source ID, grade number/title, suggested morning minutes |
| `catalog_plans` | Curriculum Plans | Plan ID and source ID; type: Topic / Single-Topic Course / Combined Course; display title, subject ID, country, rotation/cycle, status, descriptions and placement tips; **`plan_sort` as original Airtable text key (primary order)** with stable source ID tie-break |
| `catalog_plan_grades` | Curriculum Plans → Grades | Plan and grade link for every allowed grade; never flatten to a single grade string |
| `catalog_plan_rotations` | Curriculum Plans → Rotation(s) | One row per R1/R2/R3/R4 applicability |
| `catalog_editions` | Lesson Plan Editions | Edition ID/source ID; plan ID; edition display title/override; writing/review state; country, focus terms and planning notes. Preserve edition identity separately from its year/role assignments |
| `catalog_edition_year_roles` | Lesson Plan Editions | Explicit `publication_year` + edition + intended role (`Primary`, `Alternate`, `Reserved`, `Retired`, etc.), including source field (`Current` or `Next`) and snapshot timestamp; no permanent global `current`/`next` state |
| `catalog_edition_topics` | Connected Topic Editions | Specific parent **course edition** → specific **topic edition**, explicit sequence/term/order and shared-topic context; no cross-release foreign keys. For catalog display, `Plan Sort` remains primary; packet lesson-sequence configuration is separate |
| `catalog_resources` | MA Library | Canonical Resource ID, title, author, type, ISBN/ASIN, image, public rationale, availability, non-protected purchase metadata |
| `catalog_resource_assignments` | Resource Assignments | One row per **source assignment ID** with exact edition ID, role, `Choose One` selection rule, optional flag, display order, term applicability, and rationale/notes; **do not assume a single resource ID** |
| `catalog_resource_assignment_items` | Resource Assignments → Resource (linked records) | Ordered junction rows associating each source assignment with **all** linked resource IDs; `Choose One` is **advice**, never an exclusive constraint. Families can choose zero, one, or multiple options |
| `catalog_supplies` | MA Supply Library | Canonical Supply ID, name, quantity hints, location, rationale, public links, household flag |
| `catalog_supply_assignments` | Supply Assignments | Assignment ID, exact edition ID, supply ID, quantity override, optional/group/household flags, choice grouping and term applicability |
| `catalog_course_choice_groups` | **Existing** Airtable `Planning Choice Groups` | Stable source Group ID, label, optional guidance; year-specific `Current`/`Next` Active/Draft/Retired status snapshot; explicit **Choice Grade Filter** membership. Subject/Grade(s) lookups are reference only; never control visibility based on rotation or lookup grades |
| `catalog_course_choice_options` | **Existing** `Planning Choice Groups.Curriculum Plans` multi-link | Release-scoped normalized junction rows (group ID + linked **course-level Curriculum Plan** ID), resolved to specific eligible edition(s) for target publication year; validate Plan Type is never Topic. No separate Airtable options table required now; a course may appear in multiple groups |
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
| `student_course_selections` | Student, year plan, exact edition ID and optional combined-course context. **Allow multiple selections from one course-choice group**, including multiple science, math, or language courses. Never enforce group maximums in data constraints or UI |
| `household_resource_preparation` | Canonical resource, format (physical/audio/etc.), obtain/own/prepare status, optional notes; reusable across student selections |
| `household_supply_preparation` | Canonical supply, household status, quantity needed/owned, notes |
| `member_schedule_placements` | Family/student, edition and optional course context, day, section morning/afternoon, sort position, customized minutes; schedule board is the source of truth |

Identity, year access, and household RLS must be verified using distinct public, active-member, former-member, unauthorized free-plan, and developer accounts before storing real member choices.

## Phase C — Pipeline and validation

1. Read **all** scoped source records from Curriculum Planning Airtable (read-only), including explicit links and statuses.
2. Build source-ID crosswalks; check duplicates, absent required IDs, missing parent relationships, and broken edition references.
3. Map **Current Publication Status** to the intentionally live 2026–27 offering and **Next Publication Status** to intended 2027–28 offering, with year-specific snapshots. An edition marked `Primary` is intended to be offered, even if its lesson writing is unfinished. Separate release approvals by feature surface (catalog vs lesson plans/exams), and never infer membership access from either field.
4. Validate all three plan types, course→topic ordering, topic sharing, resource/supply choice groups, scheduling variants and sample-schedule status.
5. Classify every field and URL as public, entitled, protected, or internal. Reject protected links leaking into public payloads.
6. Stage the complete release in transaction-safe batches. Emit machine-readable validation/errors/warnings/counts.
7. Require manual approval of the full release and security tests.
8. Promote the exact **year + content surface + audience** publication route atomically; multiple years remain accessible simultaneously during planned overlap. Failures leave prior routes and snapshots intact.
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

- **Catalog ordering:** confirmed: `Plan Sort` is always primary; secondary keys are context-specific. Still determine exact *lesson-by-lesson packet* sequence when composition/interleaving differs from catalog order.
- **Surface-specific publish sign-off:** the `Primary` source status signals intended year offering, not that all associated lessons/PDFs are ready. Define who approves the February planning-catalog release and the June lesson/exam releases, and what tests are required.
- **Resource choices:** verified: each of the 17 multi-resource assignment records already functions as a single choice group; its source assignment ID is stable. Keep all linked alternatives and never force a one-only choice.
- **Course choice authoring:** existing `Planning Choice Groups` contains four test records (Latin Grades 7 and 8; Science Grades 9 and 10), direct course links, explicitly assigned `Course Grades (Reference)`, and separate `Current`/`Next Publication Status` fields. Do not create a second Airtable options table for this MVP. Validate choice grade/display scope independently of eligible plan grades, include only course plans (never topics), and keep recommendations nonexclusive.
- **Identity synchronization:** Memberstack webhook/server reconciliation and publication-year entitlement freshness.
- **Protected content:** member-only resource URLs, lesson packets, examinations, and later PDF delivery policy.
- **Country/rotation:** enforce and test both US and Canada variants and shared all-rotation records.
