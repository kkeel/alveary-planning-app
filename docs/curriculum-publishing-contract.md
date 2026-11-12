# Curriculum Planning → Supabase publishing contract (proposed)

Status: **working implementation specification; no database tables have been created yet.** Applies to Alveary 2027–28 and future publication years. Keep all active 2026–27 pipelines untouched.

## Authority and release model

- **Authoring authority:** Curriculum Planning Airtable (Subjects, Grades, Curriculum Plans, Lesson Plan Editions, Resource Assignments, MA Library, Supply Assignments, MA Supply Library, Scheduling, Sample Schedules, Sample Schedule Placements). Lesson-writing bases remain separate; link/lesson/exam publishing is a June 2027 deliverable.
- **Serving authority:** versioned, approved curriculum data in Supabase. This is distinct from member-owned families, students, selections, book preparations, and placements.
- **Code and history:** GitHub, with reviewed schema migrations, read-only extraction code, validation/tests, and release reports. Public JSON is optional and only generated from an approved, public-safe release when benchmarks justify it.
- **Release isolation:** development/staged releases and member-approved releases must never mix. All rows representing edition-specific curriculum must resolve to the same immutable release ID. A publisher stages *complete* datasets, validates them, then atomically updates a **publication route for a specific year, content surface and audience**. Old and new years may both remain member-visible; partial jobs cannot alter approved routes.
- **Source IDs:** persist Airtable record IDs and official Plan ID / Edition ID; never join by display title. Maintain a crosswalk to legacy Rotation 3 sort/record IDs only when old links or saved data need migration.

## Minimum relational concepts (schema design to approve before SQL)

| Concept | Data/relationships that must survive |
|---|---|
| Publication year and release | Year, rotation(s), revision, validation and approval history; immutable release plus independently scheduled availability routes **per year, content surface and audience** (not one globally active year) |
| Subject, grade, curriculum plan | Plan kind (Topic / Single-Topic Course / Combined Course), subject, grade applicability, country, rotations, cycle, overview and placement guidance; preserve Airtable **Plan Sort as the primary text sort key** before view-specific secondary keys |
| Lesson plan edition | Plan relationship; original edition ID; **explicit edition roles per publication year**; current/next Airtable statuses recorded as source selectors, **not** permanent live/readiness/entitlement flags |
| Edition-to-edition composition | Ordered links from a combined course edition to *specific topic editions*, including shared topic reuse and valid one-topic wrappers. Single-topic-course editions must not be forced to have child links |
| Library resource | Canonical book/resource, safe metadata, approved public links, *protected* URLs stored separately from public responses |
| Resource assignment | Exact edition context, potentially multiple Resource links under one assignment ID, role, optionality, term usage and notes. **Choose One is a recommendation**; members may select zero, one or multiple options |
| Supply and supply assignment | Canonical supply, linked edition context, quantities/overrides, household/group flags and term usage |
| Course choice recommendations | Explicit recommended groups authored in the existing `Planning Choice Groups` Airtable table with linked course-level plans (math pathways, Spanish/French, Latin formats, high-school science); **advisory, never enforced one-only** |
| Scheduling recommendation | Reusable frequency, minutes, grade-band options, teaching type and variation information; an edition can have multiple applicable recommendations |
| Sample schedule / placement | Publication/grade/rotation/status, day, morning/afternoon, position, exact topic/activity edition, course context and recommendation ID |
| Member entitlements | Memberstack identity and verified plan status, developer allowlist, configurable publication-year grants and expiry/reconciliation |
| Member plans | Household/student/year ownership, selected topic edition and course/print context, bookmarks, personal resource needs and member-owned schedule placements |

No source record is considered member-published merely because it exists or has a year tag. A 2027–28 edition marked **Next Publication Status = Primary** is **intended** for that year's offering even if its lesson writing is unfinished; **Current Publication Status = Primary** identifies the currently offered 2026–27 edition. Neither is a publication route, access grant, or completed-lesson certification. Planning metadata can be approved for February even when lesson/PDF content is still gated until June. Draft sample schedules, reserved/unassigned editions, and protected content must not silently become member-visible.

## Coverage: full dataset, not a few examples

On November 12, 2026 the connected Curriculum Planning base had 1,145 Plans (564 Topics, 402 Combined, 179 Single-Topic), 1,153 Editions, 560 resource assignments, 590 supply assignments, 107 scheduling recommendations, 12 draft sample schedules and 162 sample placements. This is **not** a completeness or publish-readiness certification.

A publish validator must enumerate all applicable source records and flag:

1. Missing or broken source IDs, duplicate IDs, incompatible year/rotation/country selectors, unresolved edition composition, missing topic order, and accidental course/topic cycles.
2. Zero-, one-, and many-topic course structures (do not assume one shape); shared topics across several courses; complete child-topic coverage; exact edition-version selections.
3. Multiplicity of resource assignments (including one assignment with multiple alternatives), optional books, advisory choose-one groups and bundles, missing links, contradictory term/role metadata, and shared resources needed in multiple contexts. Soft choices must **never** impose one-selection limits.
4. Scheduling method cases (`Use all`, `Choose one`, `From topics`), grade-band variants, shared scheduling recommendations, sample schedule completeness, and Draft vs approved sample visibility.
5. Public/member/developer field classifications; private IDs/secrets, member-only destinations, lesson packet URLs and examination materials excluded from public browse responses.
6. Referential integrity and row-count changes relative to prior approved release; calculate errors, warnings and intentional exclusions separately. Require **per-surface human approval** (planning catalog vs supplies/lessons/exams) and fail closed on hard errors. Check that multiple chosen courses/books remain valid.

The publisher should export a machine-readable report (counts by course type and publication status, broken references, warnings, skipped rows, protected-link checks) plus a human summary; it must not write partial results directly to the active release.

## February and June delivery gates

**By February 1, 2027:** functional dashboard, Course Explorer, Book List and Scheduling, using real published curriculum and securely saved member data. Supplies, Lesson Plans and Exams are visibly delayed until June 1 for ordinary members.

**By June 1, 2027:** approved 2027–28 supplies, lessons and exams become accessible to entitled members after acceptance tests. The **2026–27 curriculum choices and lesson packets stay accessible through June 30, 2027**, while the new school year's planning tools are already live. Starting **July 1, 2027**, remove the retired year from normal current-year entry points; decide any archival/previous-year access policy separately.

The **free Memberstack test plan** should support authorized *developer preview* only, with an independent developer allowlist and release-channel check. It must not grant normal 2027–28 membership. An ordinary active 2027–28 plan grants only approved release access. Former/prospective/public users can browse only approved public fields, and cannot access personal plans or protected curriculum. All permission checks belong in the backend / RLS—not merely in React conditionals.

## Versioned year overlap and soft-choice publication behavior

An immutable Supabase release and a member-visible feature window are **different objects**. A release may be internally staged, then approved for a specific year/audience/surface at the correct time. At February 1, 2027, make 2027–28 **courses, books and scheduling** available to eligible members without taking down 2026–27. At June 1, open the **new** supplies/lessons/exams after separate review. At July 1, retire ordinary 2026–27 routes without deleting the archived data or changing historical household plans. Future year rollovers must create frozen snapshots before `Current`/`Next` fields are repurposed.

Do not require a full import of the still-live 2026–27 legacy planner into the new Supabase project solely to support overlap. An explicitly labeled year selector/entry link can continue directing members to the existing `planning.alveary.org` while `plan.alveary.org` serves the new year's planner; design Supabase to support two hosted years later.

The soft-choice system uses the **existing** `Planning Choice Groups` Airtable table (four tested groups as of November 12, 2026), with multiple links directly to course-level `Curriculum Plans`; no separate Airtable `Planning Choice Options` table is required for the initial design. The explicit `Course Grades (Reference)` (Airtable field ID `fld2LjPhcSf3vBgMm`; explicit display-grade filter, recommended rename: `Show Choice in Grade(s)`) links decide **where a group is shown**; plan `Grade(s)` eligibility and the group's first-linked-plan grade lookup do not decide its display placement. `Current Publication Status` and `Next Publication Status` govern the appropriate publication-year snapshot, not rotation. Only `Combined Course` and `Single-Topic Course` plan kinds can be grouped; topics remain inside the linked course editions. The publisher resolves linked plans to eligible editions for each year and preserves repeated canonical courses across grade-specific groups (e.g., Advanced Nature Study in Grade 9 **and** Grade 10 recommendations). Labels such as "Suggested: choose one" are explanatory, not constraints. Selecting multiple math paths, both Spanish and French, more than one Latin format, or multiple science courses must be permitted. Similarly, an assignment's `Choose One` resource list is not a selection limit.

**Course Explorer placement invariant:** Within any publication-year release, a course linked to an **Active Planning Choice Group** is displayed **inside applicable choice groups only**, never again as a standalone course in the same ordinary list. When multiple grade contexts are selected, the same canonical course may be presented within multiple applicable groups; this must not duplicate its saved member selection. The regular course list excludes all course IDs assigned to an Active choice group for that year, while preserving `Plan Sort` and separate ungrouped course rows. For filters where a group-linked course is eligible but no visible Active group covers that grade, publish a **coverage warning**, rather than silently showing that course as an ungrouped item. Draft and retired groups are not live grouping assignments for other publication years.

For full schema details and exceptions, see [Proposed Supabase schema v1](curriculum-schema-v1.md).

## Performance criteria to test

Start Supabase-first with indexed, paginated, targeted queries and efficient joins/views. Measure load time on realistic browsers, mobile/older Chromebooks, broad/full curriculum and families with many selections. Do not assume many tiny queries are fast; batch related requests. Cache mostly immutable approved catalog information in the client. Generate static public-safe JSON only if measurements reveal a material advantage.
