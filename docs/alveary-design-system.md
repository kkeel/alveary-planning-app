# Approved Alveary visual palette and content-first design guardrails

**Owner-supplied reference:** November 20, 2026.  
**Applies to:** New Alveary planning application (`kkeel/alveary-planning-app`), across Courses, Books, Supplies, Planning Desk, Overview, and future member pages.  
**Status:** **Design reference for future changes.** This document does not approve a redesign of the working Course List or automatically change existing CSS, user preferences, or records.

> **Design goal:** A calm, recognizable Alveary planning workspace in which members can understand the curriculum and *why* each book was selected before making decisions. Use Alveary-approved colors and derived transparency; preserve the painstakingly tuned course/subject selection hierarchy.

## 1. Approved core Alveary palette — exact supplied values

**Use these hex values as supplied.** Case differences in hex digits are immaterial. New neutral colors should be selected from this list or derived by transparency/opacity from it, not invented ad hoc.

| Family | Approved swatches |
| --- | --- |
| Dark green | `#596e5e` · `#7b8b7f` · `#9da89f` · `#bdc5bf` |
| Light green | `#adb58f` · `#bec5a6` · `#ced3bc` · `#dee1d2` |
| Tan | `#babbac` · `#cecfbd` · `#e0e1d2` · `#e8e9e2` |
| Cream | `#f4eed9` · `#f6f2e1` · `#faf7ed` · `#fbfbf9` |
| Black / gray | `#262b26` · `#3b413b` · `#505650` · `#666d66` · `#d2d6d2` · `#e5e8e5` |

**Optional reference, not an automatic additional core color:** Slate Blue `#556F8C` (owner labeled **Other Options**). Get explicit design approval before introducing it as a new primary UI or semantic status color.

### Proposed use guidance (not newly approved mappings)

These are application suggestions built from the **approved** colors, not claims that a particular swatch was assigned a precise function by the owner:

| Need | Prefer approved candidates |
| --- | --- |
| Main page / warm browsing canvas | `#faf7ed` or `#f6f2e1` |
| Very light integrated detail area | `#fbfbf9` or a transparent approved cream/tan |
| Primary title/body text | `#262b26` or `#3b413b` |
| Secondary text | `#505650`, `#666d66` (check contrast) |
| Navigation / quiet action accent | `#596e5e`, `#7b8b7f` |
| Restrained dividers / outlines | `#e5e8e5`, `#d2d6d2`, `#e0e1d2` |
| Gentle interactive wash | Low-opacity approved green/tan/subject color |

Avoid introducing off-brand greens, gray-greens, cream-whites or border colors merely because they look close. A shade must either be an approved hex, an existing deliberately retained legacy exception pending review, or a documented mixture/alpha of approved palette values.

### Derived transparency and accessibility

- **Allowed:** transparency and mixtures of the approved palette and approved subject colors (`color-mix(in srgb, var(--alveary-subject) 12%, transparent)`, RGBA alpha, etc.). This lets us tune visual intensity without inventing new unrelated hues.
- **Keep subject hue intact:** low-opacity backgrounds, medium-opacity borders/rails, and fully saturated selection markers may all derive from the **same original subject color**.
- **Check the final appearance** over both warm cream backgrounds and any light surfaces. A low-contrast subject color (especially Life Skills yellow/light subjects) should not be used as small text without adequate dark ink.
- **Accessibility:** text contrast, discernible focus, hover, selected, disabled and error states matter more than matching a single low-contrast tint. Use an approved darker ink with a subject-tinted background when needed. Do not rely on color alone to communicate planned/selected status.
- Use shared CSS tokens/components for repeated patterns rather than hard-coding slightly different hex values into each page. Existing palette-related CSS may still contain legacy/provisional exceptions—see §5.

## 2. Approved curriculum subject colors — exact supplied values

These are **semantic identity colors for subjects**, not general-purpose decoration.

| Subject | Exact hex | Note from supplied reference |
| --- | --- | --- |
| Architecture | `#a0a6be` | |
| Art | `#907061` | |
| Bible | `#964945` | |
| Citizenship | `#62765c` | |
| English | `#9b5b7b` | “Audiobook” was annotated in the owner's list |
| Geography | `#4d8da2` | |
| History | `#6b6bbf` | |
| Latin | `#5a5373` | |
| Life Skills | `#d1b358` | “video” was annotated in the owner's list |
| Literature | `#c07669` | |
| Math | `#6d7eaa` | “ebook” was annotated in the owner's list |
| Modern Language | `#6db4b2` | |
| Music | `#9e6bac` | |
| Physical Education | `#bd855e` | |
| Science & Alt. Science | `#96a767` | Same hue for both |

**Authoritative implemented subject mapping:** `app/courses/legacy-subject-colors.mjs` already contains these exact colors, including `Alt. Science Options` mapped to Science. Reuse the existing `subjectColor()` helper or a shared equivalent; don't create a separate palette for Books or Supplies. The code also contains **Basic Supplies `#5A5D66`** and an unknown-subject fallback `#7e937e`: these are **pre-existing legacy exceptions**, not additions to the newly supplied approved palette. Keep compatibility until explicitly reviewed, but do not treat them as authorization for more off-brand colors.

The owner's annotations “Audiobook,” “video,” and “ebook” are preserved here verbatim; **do not infer from them that the English, Life Skills, or Math subject color should be reused as a universal media-format icon color** without a separate confirmed design decision.

## 3. Non-negotiable information visibility

### Course List

- **Course and topic descriptions, published recommendations, scheduling/grade guidance and tips are decision-making content**, not decorative filler.
- On first-visit browsing, a member must be able to encounter the substantive description/guidance **without having to know to open an obscure second layer**. The intended default experience is information-rich; an intentional Compact view may hide details.
- Preserve title/info-click disclosure and independent close/reopen behavior so returning members can reduce density when they want.
- **Do not trade away description visibility simply to make the row look tidier.** A design that feels cleaner but encourages choosing courses without understanding them is a regression.
- The current app and earlier design notes have evolving Compact / Expanded / Detailed defaults. Treat the owner's November 20 priority—**details available prominently by default**—as the product direction; verify existing behavior before changing initial defaults or saved preferences. No silent preference migration as part of unrelated visual work.

### Book List

- **Why Alveary chose the book is essential content.** Book rationales and **member-facing notes from lesson plan writers** must not be lost, truncated into meaninglessness, hidden behind a second detail accordion by default, or dropped from the data pipeline.
- Default browsing should display a **readable, substantive book rationale** alongside the cover, title/author, purchasing/format choices, term and course/topic relationship. Use an information-rich default (Detailed or an equivalent visible-rationale presentation); Compact is a deliberate alternative.
- Member-facing writer notes (edition differences, page-reference warnings, format guidance, where/how it is used, etc.) should remain easy to see **in the relevant assignment context**, not silently collapsed into generic book metadata. Preserve any privacy/publication restrictions on source notes and links.
- Full text is more important than forcing every book into a uniform height. Use breathing room, hierarchy, soft surfaces, selective disclosure for *secondary* metadata, and sensible line widths rather than hiding the rationale.
- Preserve Subject → Course → Topic → Resources as a natural discovery path and By Book as an alternate; single-topic courses do not need a redundant Topic layer.
- Same title may be visibly repeated across relevant course/topic locations; **My Books and Budget** remain consolidated household planning views, not duplicate purchase obligations.
- **Member-only resource titles remain visible in public Explore Books, but external resource links for those titles remain absent from the public data** until an authorized member route is implemented.

### Across planning pages

- The browsing surface is for understanding/exploring; the connected Planning Desk is for organizing. Familiarity, useful guidance and optional progressive disclosure should outweigh minimizing vertical page length.
- Use content hierarchy and spacing rather than piling up rails, chevrons, outlines and badges. **But never remove established meaning or guidance to reduce visual noise.**
- Compact / Expanded / Detailed describes information density; grouping By Course / By Book and scope My Plan / All Books are separate controls.
- Do not introduce a redesign that silently changes course selection, shared-topic parent context, priority statuses, student assignment, ownership, or budget calculations.

## 4. Protect the existing Course List visual hierarchy

The Course List's subject-sensitive states and hover interactions were iteratively tuned. **Treat the existing implementation as protected behavior until a separately reviewed visual experiment demonstrates a better outcome.**

- Preserve the distinction among directly selected **full subject saturation**, inherited/partially planned **lighter subject washes**, neutral/unselected entries, and excluded choices.
- Preserve subject-colored cue/rail/heading behavior, independent hover targets, toolbar-only neutral/subject hover rules, shared-topic indicator semantics, and accessible selection affordances.
- **Don't mass-replace the Course List's white card/surface backgrounds with warm cream** just to match the Book List. Warm backgrounds change the perceived strength of transparent subject tints and can upset contrast/meaning. Prototype side-by-side with the real selection colors first.
- Keep the page-level integration we like in Books and the legible course/topic structure we like in Courses without automatically making every row identical.
- Preserve the Planning Desk as a distinct working area and retain its responsive/mini/full controls.

Existing behavior references (read these before editing):
- `docs/quiet-subject-colored-course-list-actions.md`
- `docs/subject-colored-disclosure-and-desk-headers.md`
- `docs/planning-icon-button-rules.md`
- `docs/choice-group-contrast-and-desk-subject-inset.md`
- `app/courses/legacy-subject-colors.mjs`

## 5. Workflow and implementation rules for future pages/PRs

1. **Start with this reference** and the current palette/subject helper before writing new page styles.
2. **Reuse exact approved swatches** or opacity variants. For any new color outside the palette, provide a specific accessibility/functional justification, label it an exception, and seek review rather than introducing it silently.
3. Favor **shared semantic tokens** (page, surface, ink, subdued text, divider, action, subject) in one location when a color application is stable; do not replace the approved subject mapping with approximate values.
4. Inspect the working Course List's **highlighting and hierarchy** before adjusting global backgrounds, cards, selected-state tints or icon control styles. Changes to those areas need screenshot comparison and explicit acceptance.
5. Check first-visit **default information visibility** for both Courses and Books. Test how a brand-new member encounters full course description and substantive book rationale **without an extra discovery step**; then verify opt-in compact, title/info expand and return-member saved preferences.
6. Compare changes side-by-side across Course List, Book List, portable Planning Desk and full Planning, including subject examples with dark and light colors, a shared topic, a long rationale, and narrow mobile/drawer layout.
7. Verify keyboard/focus, contrast and selected-state semantics over **both existing light/white and proposed warmer surfaces**. Do not regress the established course/subject status rules.
8. Keep publishing/privacy rules independent of colors and layouts—never expose restricted source URLs through the public book preview.

### Existing implementation is not fully normalized yet

The current `app/globals.css` contains provisional tokens such as `--ink: #282c28`, `--surface: #fffdfa`, `--muted: #69716b`; other CSS files have close-but-not-approved variants. They are **not retroactively approved** by their presence in the code. This document establishes the target design palette for **new work and a future deliberate palette audit**, not a license to sweep-replace existing styles without design and contrast review. Any CSS normalization should be handled in a separate PR with visual regression checks.

**Review principle:** Rationale/description visibility and established selection meaning are required functionality. Uniform-looking pages are a secondary goal.
