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

For each published edition:

- **Topic** or **Single-Topic Course:** `app_presentation_sort = linked Curriculum Plan.plan_sort`.
- **Combined Course:** use the **smallest `Plan Sort` belonging to a directly linked topic/course edition in the same subject** as the parent. If no in-scope linked topics exist, fall back to the parent's original `Plan Sort`.
- Tie break by the parent's original `Plan Sort` and stable plan/edition ID.
- Keep subject sections ordered by `Subjects.Subject Sort`.
- Keep linked topics inside a combined course in their own `Plan Sort` order.
- Keep an Active Planning Choice Group together as one member-facing block, anchored at the earliest **app presentation sort** of its course options. The group options sort by their own app presentation sort. A course linked to an active choice group never reappears as a standalone row.

**Why not a new Airtable Curriculum Plans formula?** The correct app placement depends on the *specific connected Topic Editions for a publication year*, which can change between rotations and publication years. The underlying Curriculum Plan is reused. A formula on Curriculum Plans would have to infer or duplicate edition-specific relationships and would fail for cross-subject links. The computed key belongs to the publication snapshot, and is regenerated after edition/topic links are imported.

## Validation of the 2027–28 staged data

- All **377** editions have a new key.
- **103** Combined Courses have new topic-derived sort positions.
- All **274** Topic and Single-Topic Course records retain their original `Plan Sort`.
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

The Course List's `catalog-preview.json` now includes `presentationSort` for all 377 editions and uses it for top-level and group placement; the original `sort` is preserved for auditing, nested topic order, and tie-breaking.

## Publishing pipeline requirement

This migration backfilled the current **private development** catalog, but the stored key is not automatically recalculated whenever an editor changes Airtable or edits relationships in Supabase. **Every future draft snapshot import must regenerate `app_presentation_sort` after the edition-topic links have been refreshed, before validation and approval.** A proper publisher will own that sequence. Do not infer membership or make user-facing publication decisions from the sort value.

## UI refinements confirmed

The previously trialed **Accent line** style is now fixed for choice groups. The temporary design-style selector and explanatory right-side panel are removed, leaving that space open for paper-planning features. The Grade filter stays open for multiple checkbox selections, but closes on clicking outside the button/panel or pressing Escape. These are UI-only changes with no impact on a member's saved choices.

This change does not expose the private Supabase draft or member data. The development GitHub Pages app continues using its versioned static, course-planning-only metadata preview.
