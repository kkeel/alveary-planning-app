# Planning icon buttons — shared design rules

This document covers the 2027–28 Alveary Course List, Think Tank, My Plan, and inline student editors. The central stylesheet is **`app/planning-icon-controls.css`**, imported by `app/layout.tsx` after global CSS. **Do not add separate icon-button size or neutral hover rules to individual components.**

## Sizes and spacing

All primary course/topic actions in the Course List, Think Tank, and My Plan now use the **same 27px visible square**, matching the established Think Tank topic controls. In-line student editor tools also use the same visual size. Icons and their wrapping priority/arrangement controls share the `--planning-icon-size`, `--planning-icon-glyph`, and `--planning-icon-art` variables from `app/planning-icon-controls.css`; don't redefine them in individual components.

**Exceptions are functional, not visual-size variants:**
- **+ All** keeps the same height but grows horizontally with the full word and spacing so no text is clipped, even in a narrow List view.
- **View/Hide + i** keeps its readable word on wider Course List screens and becomes a square on small screens.
- **More (···)** is unboxed at rest. The three dots retain the same sized pointer and keyboard focus target with a neutral hover, open and focus treatment.

Avoid surrounding the dots with a permanent bordered box. Never let a long label force the icon itself smaller.

## Palette and states

Neutral tools share one border `#dbe5d8`, glyph `#68816d`, resting white background, neutral-hover background `#f0f3ee`, border `#cbd6c9`, and hover glyph `#4e6655`. Open controls use `#f1f5ed` and `#d3dcd1`; keyboard focus uses a **2px `#59836a`** ring with a 2px offset. Transitions are 120ms and disabled for reduced-motion preferences.

**Selected statuses are deliberate exceptions**: the exact directly chosen Think Tank lightbulb or +/+All My Plan action is saturated in the subject color; other controls on that selected course/topic row share the lighter subject background with a medium hover. Core, High Interest, Additional illustrations and Varied remain the original artwork and symbols. A selected row gives its neighboring toolbar actions that row's own **pale subject tint**, never the selected action's full saturation. Unchosen topics remain neutral.

The title disclosure, priority, arrangement, information, and overflow controls keep separate clickable areas; a hover on one never paints the entire topic row.

## Arrangement (optional)

- **Unset** is shown by two faint separate circles, a *visual invitation*, not a saved Separate choice. It is intentionally lighter than a committed selection.
- **Separate** uses the same pair of circles in full strength.
- **Combined** uses overlapping circles in full strength.
- **Varied** keeps its existing rollup symbol.
- The menu offers **Combined**, **Separate**, and **Leave unset** or **Same as course/plan**. There is no compulsory decision and no separate Decide Later menu item.

Historical `Later` values remain readable by the application but are interpreted as **unset/inherit** at course, topic, and student scopes. No database row is rewritten by this read-only compatibility behavior. All explicit Combined/Separate overrides and their inheritance continue working.

## Acceptance checks

Open a combined History course in Compact, Expanded, and Detailed; compare the course icon toolbar to nested topic toolbars. Open the same item in Think Tank and My Plan. Confirm size within each surface, neutral hover on each independent button, meaningful subject tint where a selection is present, and no jumps when a popover opens.

For arrangement, compare an untouched course with one explicitly set Separate; the circles should have identical shape but clearly different visual strength. Set Combined on the course, leave one topic inherited, override another to Separate, then clear the override and verify the former follows the course again. Finally check a previously saved Later setting does not block the current course selection.

## Planning information density

Compact shows course rows only; Expanded shows the same course rows plus topics immediately beneath combined courses, with no extra grade/schedule lines or empty panels; Detailed shows full guidance. Course List, Think Tank and My Plan use the same labels. Each planning surface saves its own choice; the default for a new preference is Expanded.

A member may click a title or info icon for one course or topic without changing their saved display mode. In Detailed, each course or topic can be independently closed, rather than the last closed course reopening another. Detailed guidance appears directly on that item, not behind another "Description & tips" row. Scheduling summaries are descriptive only and never replace the exact grade-specific recommendation text (including placement and teacher-attention symbols), which stays available on demand.


## Visual tuning (November 18 follow-up)

- Course and topic controls use **information → priority → arrangement → More** in Think Tank and My Plan. Course List still adds its own lightbulb and assignment actions.
- Unset priority/tag, unselected lightbulb and View/info icon use muted `#9bad9c` (matching unset arrangement). A selected planning priority/arrangement/Think Tank status still uses the intentional subject palette.
- Info controls are **unboxed** in both planning columns and the Course List View is always neutral, even when its course has been selected.
- Expanded never opens course-level schedule, grade or description panels by default; single-topic courses have no blank detail rail. Combined-course topics sit immediately beneath the course identity.
- Detailed keeps published recommendations and grade labels in the detail area **only once**, with no double separator, and opening a topic never leaves a persistent highlighted background behind its title.
- Review the mobile mini desk: per-course closures in Detailed remain closed independently until reopened or the mode is changed.

## Selected-row toolbar consistency (November 18 follow-up)

The Course List uses its existing `listRowStatus` (parent-aware Think Tank/My Plan status) to add a **toolbar-only** `cx-has-planning-selection` class. This does not change selected rows, rails, topic inheritance, or saved member records.

- **Unselected course/topic:** unchosen tools remain muted and white. **View + i** is plain, unboxed text.
- **Selected whole course (Think Tank or My Plan):** its directly clicked lightbulb or +All remains **fully saturated**. The other course and inherited topic controls use the **pale subject tint** (stronger on hover), whether each individual option is configured or unset. **Hide + i** uses the same light tint.
- **Selected single topic:** tint that topic's toolbar and its combined-course toolbar, but leave other unselected topics' toolbars neutral. Preserve shared edition/parent context.
- **View + i:** always unboxed (resting and hover), regardless of selection; on opening, **Hide + i** becomes a highlighted control. On unselected rows, Hide uses the neutral open background.
- Keep the existing selected-state semantics and aria attributes; this is visual consistency, not a change in what a button does.

## Final color / sticky-control refinement

- **Full saturated subject color:** the originating lightbulb or + / +All only, at whichever course/topic level the member clicked. This follows existing `ideaTone === "full"` or `planTone === "full"` and does not change those statuses.
- **Pale background:** every other button on that selected row, including Hide, arrangement, priority, and the *other* selection action. Hover strengthens to the medium subject wash. Individual topics not selected stay neutral even when a sibling is active.
- **Mini Planning Desk:** unset buttons use transparent backgrounds so the color of the underlying row shows through rather than leaving white tiles. Active settings and hover/focus remain legible.
- **Density switch:** Compact / Expanded / Detailed remains directly beneath the Think Tank / My Plan tabs in the mini desk; these controls are fixed siblings outside its scrolling content. Full Planning columns retain their in-column controls; the guidance sentence scrolls in the content, below the controls.

## Mini desk header structure correction

Do **not** position the portable Compact / Expanded / Detailed switch as `position: sticky` inside `.pd-body`: it overlapped scrolling subject headings and produced the impression that the list was moving through the controls. Instead, `PlanningDesk.tsx` renders `.pd-desk-controls` with the Think Tank / My Plan tabs **and** the current tab's mode switch above the single `.pd-body` scroll viewport. Its introduction comes first within the scrolling content, followed immediately by the subject list. `MyPlanPanel` avoids rendering a second switch when `densityControlInHeader` is set, but still retains its internal full-page switch.

## Mini desk layout and forward-facing tab (November 18)

The portable Planning Desk uses a **fixed top area**: title, a distinct Think Tank / My Plan tab group, then a separate Compact / Expanded / Detailed switch. The two groups are spaced rather than drawn as one large tinted box. A full-width divider sits under them. Only **below that divider** does `.pd-body` scroll; if there is at least one chosen course/topic, its short introduction appears at the beginning of the scrollable content, before the subject headings.

The first visit defaults to **My Plan**. The existing browser-scoped Planning Desk preference saves explicit tab selections using `tabExplicit`. A legacy saved Think Tank tab from the old default is migrated to My Plan once (there was no way to distinguish an old automatic Think Tank default from a deliberate Think Tank choice), then every new choice is remembered. Think Tank and My Plan preserve their separate density preferences independently. The existing default density remains Expanded, as the user has been reviewing, unless the member chooses Compact or Detailed.

## Course List shared-topic cue — arrow only

A topic appearing under more than one published combined parent has a small **↔** after its title. This is a relationship cue, *not* another My Plan / Think Tank membership badge.

- The arrow is **neutral gray-green** when this particular parent/topic occurrence is not selected, even if the same curriculum topic is saved under a different parent.
- The arrow uses the current **subject's active text color** once this occurrence is selected in My Plan or Think Tank, whether directly or inherited from a whole-course action.
- The tooltip/accessibility label is just **"Included in:"** followed by the published course names on separate lines. No visible "↔ My Plan" or "↔ Think Tank" text remains.
- Inheritance, student assignments, course highlights, subject rails and toolbar selection colors stay governed by the existing `listRowStatus`; this change is a topic-title indicator only.

## Full Planning Desk scroll boundary and shared-topic provenance

The full two-column Planning Desk also keeps its **Compact / Expanded / Detailed** selector outside the independently scrolling `.pd-full-column-body` (between each column title and its scroll viewport). It must not use a sticky overlay within the subject list; that allowed labels to appear behind the controls. The introduction scrolls within its column, while the column title and mode selector remain in place.

Shared-topic arrows in the Course List have **two independent meanings** when combined with the existing row state:

- **Neutral ↔**: the topic occurs in multiple published courses but is not currently selected in Think Tank or My Plan under any parent.
- **Subject-colored ↔**: the topic occurs in multiple courses and is selected in Think Tank or My Plan through *at least one* parent, even if the currently displayed parent is not selected.
- **Highlighted row + subject-colored ↔**: the topic is selected in the currently displayed parent context. This does **not** imply it was also selected elsewhere. Student assignments always remain independent by parent.

The arrow tooltip lists only **"Included in:"** and the published parent course names, in natural grade order. The icon and row colors already convey selection state, so the tooltip must not repeat Think Tank / My Plan status or assignment explanations.

### Hover copy simplification

The shared-topic arrow tooltip is deliberately minimal: `Included in:\n<Course 1>\n<Course 2>`. Do not add selection status, assignments, instructions, or generic prose. The arrow and row styling cover those meanings visually.
