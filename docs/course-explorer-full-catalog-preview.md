# 2027–28 Course Explorer — full-catalog design preview

**Status:** working UI prototype for the **new planning app** only. No changes to the existing 2026–27 production planner.

## Source and display

- **377** intended 2027–28 Next Primary editions (internal validation count; deliberately hidden from the member-facing Course List) from Curriculum Planning Airtable, already staged in a private Supabase development draft snapshot (release `2f0d2641-be1c-4f60-833a-4f09b10accf6`).
- Exported **public-safe course planning metadata only** from that snapshot into `app/courses/catalog-preview.json` to make the GitHub Pages static site interactive immediately: **184 course-level options**, **193 topic editions**, **308 valid course-to-topic links**, **4 Active Planning Choice Groups**, **8 group options** (7 unique course IDs). The data is versioned in GitHub; it is *not* live-synced.
- Course titles, descriptions, combining/placement tips, subjects, grades, and original `Plan Sort` come from the actual staged catalog. **All 298 direct scheduling assignments across 268 Primary editions have now been imported** from Airtable (98 source schedule records), preserving multiple assignments, duration, weekly frequency, grade bands, school-day and teacher-attention symbols, optional notes, and exact `Display Grade` labels including `+`. Student selections have not been imported.
- All **193 topic editions** are linked within their relevant course(s). Topics are not separate top-level choices. One of 308 links points to a nested Single-Topic Course, represented within its combined parent.
- A 2027–28 History combined course references an older retired 2023–24 edition in Airtable. That cross-year link remains a publisher validation finding and was **not** quietly reintroduced into the exported graph.

## Visual behavior

- Match the supplied 2026-11-13 mock-up's **list, not card** presentation: a ~840px reading column, quiet right whitespace, thin row dividers, combined-course topics always visible, and details expand in place only for additional course or topic information. No topic-count banners or rule above the first topic.
- Reuse original brand: `#FAF7ED` background, `#262B26` text, `#596E5E` sage, `#ADB58F` olive, `#DDE2D5` borders; Plantin MT Pro headings, Circular Pro course titles, DM Sans details.
- Reuse **last year's two overlapping circles** icon with original `#F4F6FA` Combining & Placement Tips callout.
- Compact grade/subject/search tools appear *after* the heading, without making members pass through a filter page. Multiple grades are supported, including `Grade+` eligibility. Left navigation, topbar, and filter/mode toolbar remain accessible while scrolling.
- A course linked into an Active Planning Choice Group is **not** emitted as a standalone row, even when a grade filter hides that group; group grade membership is explicit, not inferred from course eligibility. A course may appear in multiple grade groups but remain one plan ID. The group heading shows only the exact authored Airtable title and optional actual guidance; a clear bottom divider ends each group.
- **List** mode is default; **Planning** uses a paper-style notes scratchpad and course bookmarks; **Compare** lets you put up to 3 courses side by side. Bookmarks, comparison choices, and notes are stored **on this browser only**. No member account sync or saved Supabase planning state yet.
- Browser Print prints the current list/filter/expanded states and hides the editing controls.

## Important preview visibility decision

The new Next.js planner is currently exported as **public static files by GitHub Pages**. The metadata bundled with `catalog-preview.json` is therefore *publicly readable by anyone who visits or inspects the site's files*, regardless of sign-in or the inaccessible underlying Supabase Draft snapshot. The user explicitly requested full-catalog design testing now and to build the membership/entitlement enforcement layer afterward.

The static export intentionally **excludes** actual lesson blocks, lesson packet PDFs, development notes, protected resource destinations, member/student selections, Supabase secret/service-role credentials, and other private data. Do not add these fields to `catalog-preview.json`.

## Before production/member release

1. Replace static catalog bundling with a properly authorized, year-aware Supabase delivery path and appropriate RLS / membership checks. Static GitHub Pages does not enforce access to bundled JSON.
2. Build repeatable validated Airtable-to-Supabase publication and stale-asset invalidation. The current JSON is a **snapshot** and will not automatically track source edits.
3. Import and connect resource/book and supply data; direct scheduling recommendations are already staged, although future source refreshes still require a publishing pipeline.
4. Persist member planning choices and notes in a per-family Supabase model only after authorization and ownership checks are verified.
5. Resolve the retired History edition reference and science grade-coverage findings before approving the release.

## Verification

`npm run test:catalog` validates source counts, relationships, choice-group options and absence of obviously protected fields. `npm run build` runs the same test before producing the static site.

## Sorting and schedule relationship notes

All top-level rows and topics within a combined course are sorted using the original **Airtable `Plan Sort` text**. There is an unavoidable display trade-off: a course choice group must appear as one block, even when two of its options have nonadjacent sort keys. We currently anchor each group at the earliest contained `Plan Sort`, and sort its options internally; exact *global interleaving* across unrelated rows and uninterrupted group boundaries cannot both be achieved. The source values have not been rewritten.

New development-only migration: `supabase/migrations/20261113221859_catalog_edition_schedule_recommendations.sql`. The private draft release contains 298 edition/schedule associations. The table has RLS enabled and revokes public/member privileges. The preview's `schedules[]` per edition is a static snapshot from those rows, not a live read.

The source has no direct scheduling recommendations for 109 of the 377 editions (many are combined courses whose topic editions carry scheduling). We do not synthesize values for those. No publication routes or member-facing Supabase grants were created.
