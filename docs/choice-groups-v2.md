# Choice Groups v2 — normal course grades, authored tags, linked guidance

**Date:** November 17, 2026. **Scope:** next-year Alveary Course List,
private 2027–28 development catalog. Do not touch the live 2026–27 planner.

## Airtable → app

- `Planning Choice Groups`: parent `Choice Group` heading and rich-text
  `Guidance Message`, linked to one or more `Planning Choice Tags`.
- `Planning Choice Tags`: neutral member-visible `Choice Tag`, parent group
  link, multiple canonical `Curriculum Plans`, optional tag sort, current/next
  publication-year status.
- `Curriculum Plans` and the chosen year-specific `Lesson Plan Editions`:
  **sole authority for grade applicability**, country, display title,
  descriptions, and curriculum sorting. Tags are *not* grade restrictions and
  linked-course grade lookups do not control the choice group's visibility.

Airtable test fixture: 3 parent groups; 4 tags; 14 plan links. Science is one
parent group, tagged **Standard Discipline** (Chemistry, Biology, Physics)
and **Elective Alternative** (seven courses). Latin Level 1 / Level 2 each
have one appropriately named tag. A parent/group heading is guidance, never
an exclusive radio choice or mandatory assignment limit.

## Supabase

- Add closed, RLS-enabled `catalog_course_choice_tags` and
  `catalog_course_choice_tag_options` with release-scoped keys/FKs.
- Existing `catalog_course_choice_groups` becomes the parent name/guidance
  table for the new model. The old `catalog_course_choice_group_grades` and
  `catalog_course_choice_options` represent obsolete draft representations
  and are intentionally retained, not used by the v2 Course List.
- Dev project migration version: `20261117141946`, recorded in
  `supabase/migrations/20261117141946_catalog_course_choice_tags_and_tag_options.sql`.
- Draft 2027–28 data seed: `docs/sql/2027-28-draft-choice-group-tag-snapshot.sql`,
  sourced from Airtable. **Never seed an approved release in place.** Frozen
  published data requires staged validation and a new release revision.

## Course List behavior

1. Filter every course using its existing **plan/edition grades**, Grade+,
   country, query, and year eligibility. No second grade selector or implicit
   tag grade filter.
2. Exclude current-year active tag-linked courses from standalone rows.
   Gather their options once under the parent group, deduplicate by **Plan ID**.
   If a course has two tags, show both labels on the one row.
3. Anchor group at the first currently *visible* eligible option by course
   presentation sort, and show its heading only if an option survives filters.
   Heading and options form a gentle bracket with a closing divider.
4. Keep all existing CourseRow interactions, subtopics, country/scheduling
   metadata, student assignment, Think Tank bulbs, + controls, and selected
   subject-color rails. Tag labels are calm gray, not selection-state colors.
5. Render rich text from Airtable as escaped text and safe HTTP(S) Markdown
   links. Use `target="_blank"`, `rel="noopener noreferrer"`, and no
   `dangerouslySetInnerHTML`. Preserve line breaks.

## Browser acceptance checklist

| Course grade filter | Expected Science group options |
| --- | ---: |
| Grade 1–8 only | no group heading, 0 high-school options |
| Grade 9 | 5 |
| Grade 10 | 6 |
| Grade 11 | 9 |
| Grade 12 | 10 |
| Grades 3 + 10 | Science Grade 3 regular course; then heading and 6 high-school options |
| All grades | grades 1–8 normal courses; one heading and 10 high-school options |

- Latin groups display Level 1/2 headings + respective tags and normal
  individual course rows; Latin 3/4 must sit **outside** the groups.
- Selected Latin 1 and a selected Science option must show exactly the
  same subject-colored status rail/background as a selected History course,
  with a visible colored action control where applicable.
- Expand long descriptions in both groups. Option tags remain on the
  individual course titles; no numeric `Choice 1/2` ranks, giant dark
  outlines, or duplicate records/lesson content.
- Follow the High School Science Placement Guide link in the neutral
  Science guidance (published from the Airtable Markdown).
- Search for `Biology`, or for text in the parent guidance, and verify
  the group heading stays only when a matching **grade-eligible** course
  remains; never show an empty heading.
- Check a phone viewport, the desktop Course List/Planning Desk split,
  print preview, focus/keyboard links, and U.S./Canada filters.

## Automated checks

- `tests/catalog-preview.test.mjs` checks the expected source record
  and tag coverage.
- `tests/course-choice-group-contrast.test.mjs` checks all seven listed
  grade-filter cases, safe guidance link parsing, group ordering,
  deduplication signals, neutral style rules and preserved selection tones.
- Supabase dev SQL confirms counts: 3 active parent groups, 4 active tags,
  14 option links, 10 unique Science courses; Science matched course
  counts by grade: 8→0, 9→5, 10→6, 11→9, 12→10.

The static preview is **not live-synced** to Airtable. A reviewed publisher
must refresh the release + preview when source groups or tags change.
