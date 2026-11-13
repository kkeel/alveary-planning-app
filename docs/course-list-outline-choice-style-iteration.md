# Course List iteration — nested outline, choice-group designs, and independent sort purposes

> **Decision recorded November 13, 2026:** The **Accent line** group design was selected. The design comparison panel has been removed. The edition-based **App Presentation Sort** has now been created in the development Supabase catalog and applied to the Course Explorer. See [Course Explorer app presentation order](course-explorer-app-presentation-sort.md) for the implemented rules and tests. The alternatives below are retained as historical design notes, not current user settings.


**Design state:** Iteration following November 13 user review. Existing 377-edition 2027–28 draft metadata remains unchanged.

## Changes being trialed

1. **Course disclosures:** Start the page with every course collapsed. Clicking **View details** opens the course information and its nested topic outline together. Individual topic rows get their own independent **View details** controls for grade, scheduling, description and placement tips. Reuse the actual two-overlapping-circles tips symbol.
2. **Visible hierarchy:** Topic outline starts under a subtle dividing line inside the expanded course and is indented further. Thin lines still separate adjacent topics. The topic outline itself has **no left-hand vertical border**, so it cannot collide with the choice group's left accent stripe.
3. **Scheduling divider:** The vertical line between scheduling assignments and the grade label stretches the **full height of the scheduling column**, not just the first schedule line.
4. **Quiet filter toolbar:** Keep navigation, filters, and modes sticky but remove the toolbar's drop shadow.
5. **Choice-group styling trials:** Exact Airtable choice titles and optional author-written guidance only, no invented explanatory text:
   - **Accent line (default):** muted olive stripe on the left, pale header, quiet bottom rule
   - **Fine outline:** thin complete outline around the group's rows with a white header
   - **Simple dividers:** horizontal top/bottom rules and a plain header, no perimeter/stripe
   The course data, option count, grade scopes and selection behavior are identical for all three. Switch between them using the **Design preview** selector in the right-side whitespace; use the Science or Latin shortcut to filter directly to a group. This selector is a temporary design test control, not a permanent member setting.

## Sorting architecture: do not overload Plan Sort

The user has identified two genuinely different ordering contexts:

| Purpose | Proposed sorting contract | State |
| --- | --- | --- |
| Airtable curriculum/lesson-writing **planning interfaces** | Put **Combined Course** records at the bottom of their relevant subject or grade view; editors work mainly with topic and single-topic records | **Design proposal**, no Airtable field/view modified |
| Member-facing **Course Explorer** | Show topics in their own `Plan Sort` order, but place the *parent Combined Course wrapper* where its first relevant topic belongs in the member's reading sequence. Single-topic courses use their own sort. Keep grade-specific choice groups intact and sort within each group | **Design proposal**, not enabled in this PR |
| Source/audit baseline | Preserve the exact string `Curriculum Plans.Plan Sort` and edition lookup in published snapshots, unchanged | **Already implemented** |

**Recommendation for the next review:** add **a distinct app placement sort** (prefer a computed/materialized per-release key anchored to included Topic Editions) and **a separate authoring-interface grouping/sort**, rather than rewriting `Plan Sort` to satisfy both. Inspect cross-grade shared topics, plan subtype, and choice-group anchors before we select the exact formula. A combined course with no in-snapshot topic still needs a deterministic fallback to its own `Plan Sort`. Any final sort must preserve the author's subject grouping and allow grade/subject filters, multiple grade-specific choice groups, and shared topics without duplicating curriculum records.

We deliberately **do not add new Airtable fields or Supabase schema changes** in this design iteration. This prevents premature sorting behavior from disrupting the existing year-one curriculum snapshots.

## Safety and source scope

All original 377 intended 2027–28 Primary editions, 308 within-snapshot course/topic links, four choice groups and 298 scheduling recommendations remain in the static metadata preview. No lesson packet contents, member records, restricted URLs, or credential material added. No public Supabase permissions, and no changes to the live 2026–27 curriculum tools.
