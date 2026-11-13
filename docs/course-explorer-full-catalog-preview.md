# 2027–28 Course Explorer — full-catalog design preview

**Status:** working UI prototype for the **new planning app** only. No changes to the existing 2026–27 production planner.

## Source and display

- **377** intended 2027–28 Next Primary editions from Curriculum Planning Airtable, already staged in a private Supabase development draft snapshot (release `2f0d2641-be1c-4f60-833a-4f09b10accf6`).
- Exported **public-safe course planning metadata only** from that snapshot into `app/courses/catalog-preview.json` to make the GitHub Pages static site interactive immediately: **184 course-level options**, **193 topic editions**, **308 valid course-to-topic links**, **4 Active Planning Choice Groups**, **8 group options** (7 unique course IDs). The data is versioned in GitHub; it is *not* live-synced.
- Course titles, descriptions, combining/placement tips, subjects, grades, and original `Plan Sort` come from the actual staged catalog. Course scheduling frequency, teacher-attention metadata, and student selections have **not yet been imported**, so the preview does not invent them.
- All **193 topic editions** are linked within their relevant course(s). Topics are not separate top-level choices. One of 308 links points to a nested Single-Topic Course, represented within its combined parent.
- A 2027–28 History combined course references an older retired 2023–24 edition in Airtable. That cross-year link remains a publisher validation finding and was **not** quietly reintroduced into the exported graph.

## Visual behavior

- Match the supplied 2026-11-13 mock-up's **list, not card** presentation: a ~840px reading column, quiet right whitespace, thin row dividers, details expand in place.
- Reuse original brand: `#FAF7ED` background, `#262B26` text, `#596E5E` sage, `#ADB58F` olive, `#DDE2D5` borders; Plantin MT Pro headings, Circular Pro course titles, DM Sans details.
- Reuse **last year's two overlapping circles** icon with original `#F4F6FA` Combining & Placement Tips callout.
- Compact grade/subject/search tools appear *after* the heading, without making members pass through a filter page. Multiple grades are supported.
- A course linked into an Active Planning Choice Group is **not** emitted as a standalone row, even when a grade filter hides that group; group grade membership is explicit, not inferred from course eligibility. A course may appear in multiple grade groups but remain one plan ID.
- **List** mode is default; **Planning** uses a paper-style notes scratchpad and course bookmarks; **Compare** lets you put up to 3 courses side by side. Bookmarks, comparison choices, and notes are stored **on this browser only**. No member account sync or saved Supabase planning state yet.
- Browser Print prints the current list/filter/expanded states and hides the editing controls.

## Important preview visibility decision

The new Next.js planner is currently exported as **public static files by GitHub Pages**. The metadata bundled with `catalog-preview.json` is therefore *publicly readable by anyone who visits or inspects the site's files*, regardless of sign-in or the inaccessible underlying Supabase Draft snapshot. The user explicitly requested full-catalog design testing now and to build the membership/entitlement enforcement layer afterward.

The static export intentionally **excludes** actual lesson blocks, lesson packet PDFs, development notes, protected resource destinations, member/student selections, Supabase secret/service-role credentials, and other private data. Do not add these fields to `catalog-preview.json`.

## Before production/member release

1. Replace static catalog bundling with a properly authorized, year-aware Supabase delivery path and appropriate RLS / membership checks. Static GitHub Pages does not enforce access to bundled JSON.
2. Build repeatable validated Airtable-to-Supabase publication and stale-asset invalidation. The current JSON is a **snapshot** and will not automatically track source edits.
3. Import and connect resource/book, supply, and scheduling information before showing accurate course schedule minutes or teacher-attention icons.
4. Persist member planning choices and notes in a per-family Supabase model only after authorization and ownership checks are verified.
5. Resolve the retired History edition reference and science grade-coverage findings before approving the release.

## Verification

`npm run test:catalog` validates source counts, relationships, choice-group options and absence of obviously protected fields. `npm run build` runs the same test before producing the static site.
