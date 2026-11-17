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
| Course choice recommendations | Parent `Planning Choice Groups` headings/guidance plus child `Planning Choice Tags` with linked course-level plans (Latin formats, science disciplines/electives, later pathways); ordinary plan/edition grades filter options, and **choose-one is advisory only** |
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

The soft-choice system now uses two Airtable authoring tables, **Planning Choice Groups** (member-facing heading and rich guidance) and **Planning Choice Tags** (named category/level labels, parent group, course links, optional sort, and Current/Next publication statuses). The 2027–28 development draft has three groups and four tags, with 10 unique Science and 4 unique Latin courses across 14 course-plan links. A course linked to multiple tags remains one canonical plan/edition; tags don't govern grade eligibility.

**Course Explorer placement invariant:** First apply the usual course/edition grade, `Grade+`, country, search and release rules to each course. Then display every matching grouped course once within its parent choice group, with all its authored tag labels; never repeat it as an ungrouped standalone course. Show the group heading only if it has at least one visible eligible option, anchored at its earliest visible option in the normal subject sort. Science cannot appear in grades 1–8-only views, and appears after the ordinary lower-grade Science courses in mixed/all-grade views. Latin 3 and 4 remain normal rows outside the Level 1/2 choice groups. Neutral list borders must not overpower subject-colored selected states.

**Rich guidance:** Preserve Airtable `Guidance Message` as Markdown-capable text, including linked text, and render safely with allowed HTTP(S) anchors (no raw HTML). Current Science guidance links to the High School Science Placement PDF. "Choose one" remains advice, not enforced exclusivity, for science, Latin, other future choice groups and book alternatives.

**Supabase publication:** `catalog_course_choice_groups` stores parent groups; `catalog_course_choice_tags` stores tag labels, parent link and status; `catalog_course_choice_tag_options` stores normalized tag/course plan links. The old `catalog_course_choice_group_grades` and `catalog_course_choice_options` tables are retained only for legacy draft-history compatibility. Future publisher updates must write the new relations transactionally into a staged release, validate source IDs/course kinds and ordinary grade eligibility, and keep the release isolated until approval. The developer draft seed is captured in `docs/sql/2027-28-draft-choice-group-tag-snapshot.sql` and the schema update in `supabase/migrations/20261117141946_catalog_course_choice_tags_and_tag_options.sql`.

For full schema details and exceptions, see [Proposed Supabase schema v1](curriculum-schema-v1.md).

## Performance criteria to test

Start Supabase-first with indexed, paginated, targeted queries and efficient joins/views. Measure load time on realistic browsers, mobile/older Chromebooks, broad/full curriculum and families with many selections. Do not assume many tiny queries are fast; batch related requests. Cache mostly immutable approved catalog information in the client. Generate static public-safe JSON only if measurements reveal a material advantage.
