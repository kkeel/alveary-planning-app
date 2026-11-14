# Course Explorer app presentation order — 2027–28 working rule

## Why this differs from Airtable Plan Sort

The real Curriculum Planning Airtable `Curriculum Plans.Plan Sort` is a formula that concatenates:

1. `Subject Sort`;
2. a History-vs-other subject discriminator;
3. a padded `Type Sort` (**99** if blank);
4. padded `Lowest Grade` (**99** if blank);
5. `Sub Type Sort` (**9** if blank);
6. a rotation marker;
7. a two-character cycle marker.

This is retained **as exact text** on `catalog_plans.plan_sort`. Do **not** cast it to a number, change the formula, or replace it with an app-specific sort. It continues to serve the Airtable lesson-writing and authoring interface, where Combined Courses naturally sort after their topic-level records.

## Implemented member-facing field

The development Supabase migration `20261113233818_edition_app_presentation_sort.sql` adds **`catalog_editions.app_presentation_sort`**, deliberately edition/release-scoped rather than stored on the underlying Curriculum Plan.

For each staged edition (before the subject-specific overlay):

- **Topic** or **Single-Topic Course:** `app_presentation_sort = linked Curriculum Plan.plan_sort`.
- **Combined Course:** use the **smallest `Plan Sort` belonging to a directly linked topic/course edition in the same subject** as the parent. If no in-scope linked topics exist, fall back to the parent's original `Plan Sort`.
- Tie break by the parent's original `Plan Sort` and stable plan/edition ID.
- Keep subject sections ordered by `Subjects.Subject Sort`.
- Keep linked topics inside a combined course in their own `Plan Sort` order.
- Keep an Active Planning Choice Group together as one member-facing block, anchored at the earliest **app presentation sort** of its course options. The group options sort by their own app presentation sort. A course linked to an active choice group never reappears as a standalone row.

**Why not a new Airtable Curriculum Plans formula?** The correct app placement depends on the *specific connected Topic Editions for a publication year*, which can change between rotations and publication years. The underlying Curriculum Plan is reused. A formula on Curriculum Plans would have to infer or duplicate edition-specific relationships and would fail for cross-subject links. The computed key belongs to the publication snapshot, and is regenerated after edition/topic links are imported.

## Validation of the 2027–28 staged data

- All **377** editions have a new key.
- **103** Combined Courses first receive topic-derived positions.
- A **subject-specific presentation overlay** now adjusts 66 course-level records (History 15, Citizenship 15, Math 26, Modern Language 10), including Single-Topic Courses. Topic records still retain their original `Plan Sort`.
- **14** Citizenship combined courses reference Literature's `Community Read Alouds`, among their topics. Their app keys intentionally use their **Citizenship** topic sort instead, avoiding misplaced courses.
- Source `Plan Sort` in Airtable and Supabase remains unchanged.

Examples:

| Course | Authoring `Plan Sort` | New app presentation sort |
| --- | --- | --- |
| Literature: Grade 1 | `10199011-400` | `10101019-000` |
| Mathematics: Grade 9 | `11198091-000` | `11101091-000` |
| Science: Grade 7 | `15198079-000` | `15101079-000` |
| Citizenship: Grade 4 | `4199049-400` | `4101049-000` |
| Art: Level 1 (Single-Topic) | `2101019-000` | `2101019-000` |

The Course List's `catalog-preview.json` includes the final `presentationSort` for all 377 editions and uses it for top-level and group placement; the original `sort` is preserved for auditing, nested topic order, and tie-breaking.

## Subject-specific ordering rules (approved November 13, 2026)

Migration: `20261114004309_subject_specific_app_presentation_order.sql` (applied to the 2027–28 **development Draft** release and versioned in GitHub). This migration recomputes the *same-subject* topic anchor from the source Plan Sort first, then adds these stable keys; it is idempotent when rerun on the same data.

| Subject | Course presentation grouping and precedence |
| --- | --- |
| **Citizenship** | Grade order, within grade **U.S. before Canada**; `Plutarch: Beginner Track` **at the very end** of Citizenship offerings |
| **History** | Grade order, within grade **U.S. before Canada**, like the existing Geography ordering; multi-grade titles use lowest linked grade |
| **Math** | Grade order, **RightStart → Beast Academy → other standard Mathematics → Denison** for offerings at the same grade (the standard Mathematics and Denison choices are currently grades 9–11). Every **Story of Arithmetic / Story of Geometry** option comes **after all traditional math courses** |
| **Modern Language** | Every **Spanish** level first (Lower Spanish then Upper Spanish 1–4), followed by every **French** level (Lower French then Upper French 1–4) |
| **Literature** | Unchanged: `Shakespeare: Beginner Track` already precedes `Shakespeare: Grades 5-8` by source Plan Sort, and this is checked explicitly |
| **All other subjects** | Retain existing topic-anchored presentation order and authoring sort as a tie breaker |

All **377** editions retain their original Airtable `Plan Sort` in `catalog_plans.plan_sort`. The 193 Topic editions retain their original app sort. The user-facing Grade and subject filters, year-specific course choice group suppression, and grade-specific group placement remain unchanged. **A choice group remains one uninterrupted visual block** sorted by its member course presentation keys; it may anchor earlier than an ungrouped course whose original sort is between its members.

**Implementation detail:** For the four adjusted subjects, all top-level course keys receive a subject-stable prefix plus a zero-padded grade, country, math-provider, or language-precedence code, followed by their topic-anchored original value for tie breaking. This is a sortable **text** field, not a numeric rank. Future publication-year import scripts should reproduce this logic or run the reviewed SQL adapted to the new Draft release. Do not point the import at a live/approved snapshot or rewrite Plan Sort in Airtable.

**Data-boundary note:** The last import still has the known 2027–28 History Grade 2–3 U.S. reference to a retired 2023–24 child edition, which remains excluded from within-year composition and flagged for editorial validation before the release goes live.

## Publishing pipeline requirement

Two tracked migrations backfilled the current **private development** catalog: first the topic anchor and then the subject-specific order. The stored key is not automatically recalculated whenever an editor changes Airtable or edits relationships in Supabase. **Every future draft snapshot import must regenerate `app_presentation_sort` after the edition-topic links have been refreshed, before validation and approval.** A proper publisher will own that sequence. Do not infer membership or make user-facing publication decisions from the sort value.

## UI refinements confirmed

The previously trialed **Accent line** style is now fixed for choice groups. The temporary design-style selector and explanatory right-side panel are removed, leaving that space open for paper-planning features. The Grade filter stays open for multiple checkbox selections, but closes on clicking outside the button/panel or pressing Escape. These are UI-only changes with no impact on a member's saved choices.

This change does not expose the private Supabase draft or member data. The development GitHub Pages app continues using its versioned static, course-planning-only metadata preview.
