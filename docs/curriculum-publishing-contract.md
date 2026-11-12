# Curriculum Planning → Supabase publishing contract (proposed)

Status: **working implementation specification; no database tables have been created yet.** Applies to Alveary 2027–28 and future publication years. Keep all active 2026–27 pipelines untouched.

## Authority and release model

- **Authoring authority:** Curriculum Planning Airtable (Subjects, Grades, Curriculum Plans, Lesson Plan Editions, Resource Assignments, MA Library, Supply Assignments, MA Supply Library, Scheduling, Sample Schedules, Sample Schedule Placements). Lesson-writing bases remain separate; link/lesson/exam publishing is a June 2027 deliverable.
- **Serving authority:** versioned, approved curriculum data in Supabase. This is distinct from member-owned families, students, selections, book preparations, and placements.
- **Code and history:** GitHub, with reviewed schema migrations, read-only extraction code, validation/tests, and release reports. Public JSON is optional and only generated from an approved, public-safe release when benchmarks justify it.
- **Release isolation:** development/staged releases and member-approved releases must never mix. All rows representing edition-specific curriculum must resolve to the same release ID. A publisher stages *complete* datasets, validates them, then promotes one release pointer; partial jobs cannot alter the member-approved release.
- **Source IDs:** persist Airtable record IDs and official Plan ID / Edition ID; never join by display title. Maintain a crosswalk to legacy Rotation 3 sort/record IDs only when old links or saved data need migration.

## Minimum relational concepts (schema design to approve before SQL)

| Concept | Data/relationships that must survive |
|---|---|
| Publication year and release | Year, rotation(s), status, channel, revision, publish timestamp; immutable approved release |
| Subject, grade, curriculum plan | Plan kind (Topic / Single-Topic Course / Combined Course), subject, grade applicability, country, rotations, cycle, overview and placement guidance |
| Lesson plan edition | Plan relationship; original edition ID; assigned publication years; current vs next publication roles; approved/retired/needs-assignment distinctions |
| Edition-to-edition composition | Ordered links from a combined course edition to *specific topic editions*, including shared topic reuse and valid one-topic wrappers. Single-topic-course editions must not be forced to have child links |
| Library resource | Canonical book/resource, safe metadata, approved public links, *protected* URLs stored separately from public responses |
| Resource assignment | Exact edition context, resource ID, resource role, optionality, term usage and notes; preserve assignment multiplicity and named choice groups/bundles as they are defined |
| Supply and supply assignment | Canonical supply, linked edition context, quantities/overrides, household/group flags and term usage |
| Scheduling recommendation | Reusable frequency, minutes, grade-band options, teaching type and variation information; an edition can have multiple applicable recommendations |
| Sample schedule / placement | Publication/grade/rotation/status, day, morning/afternoon, position, exact topic/activity edition, course context and recommendation ID |
| Member entitlements | Memberstack identity and verified plan status, developer allowlist, configurable publication-year grants and expiry/reconciliation |
| Member plans | Household/student/year ownership, selected topic edition and course/print context, bookmarks, personal resource needs and member-owned schedule placements |

No source record is considered member-published merely because it exists or has a year tag. The approval rule and country/rotation choices must be explicit. Source values marked Draft, Reserved, In Development, or Needs Assignment must not be silently promoted.

## Coverage: full dataset, not a few examples

On November 12, 2026 the connected Curriculum Planning base had 1,145 Plans (564 Topics, 402 Combined, 179 Single-Topic), 1,153 Editions, 560 resource assignments, 590 supply assignments, 107 scheduling recommendations, 12 draft sample schedules and 162 sample placements. This is **not** a completeness or publish-readiness certification.

A publish validator must enumerate all applicable source records and flag:

1. Missing or broken source IDs, duplicate IDs, incompatible year/rotation/country selectors, unresolved edition composition, missing topic order, and accidental course/topic cycles.
2. Zero-, one-, and many-topic course structures (do not assume one shape); shared topics across several courses; complete child-topic coverage; exact edition-version selections.
3. Multiplicity of resource assignments, optional books, choice groups/bundles, missing links, contradictory term/role metadata, and shared resources needed in multiple contexts.
4. Scheduling method cases (`Use all`, `Choose one`, `From topics`), grade-band variants, shared scheduling recommendations, sample schedule completeness, and Draft vs approved sample visibility.
5. Public/member/developer field classifications; private IDs/secrets, member-only destinations, lesson packet URLs and examination materials excluded from public browse responses.
6. Referential integrity and row-count changes relative to prior approved release; calculate errors, warnings and intentional exclusions separately. Fail closed on hard errors and require a human approval to promote.

The publisher should export a machine-readable report (counts by course type and publication status, broken references, warnings, skipped rows, protected-link checks) plus a human summary; it must not write partial results directly to the active release.

## February and June delivery gates

**By February 1, 2027:** functional dashboard, Course Explorer, Book List and Scheduling, using real published curriculum and securely saved member data. Supplies, Lesson Plans and Exams are visibly delayed until June 1 for ordinary members.

**By June 1, 2027:** approved supplies, lessons and exams become accessible to entitled members after acceptance tests.

The **free Memberstack test plan** should support authorized *developer preview* only, with an independent developer allowlist and release-channel check. It must not grant normal 2027–28 membership. An ordinary active 2027–28 plan grants only approved release access. Former/prospective/public users can browse only approved public fields, and cannot access personal plans or protected curriculum. All permission checks belong in the backend / RLS—not merely in React conditionals.

## Performance criteria to test

Start Supabase-first with indexed, paginated, targeted queries and efficient joins/views. Measure load time on realistic browsers, mobile/older Chromebooks, broad/full curriculum and families with many selections. Do not assume many tiny queries are fast; batch related requests. Cache mostly immutable approved catalog information in the client. Generate static public-safe JSON only if measurements reveal a material advantage.
