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

**Selected statuses are deliberate exceptions**: a selected course lightbulb and student-assignment action may keep their subject tint. Core, High Interest, Additional illustrations and Varied remain the original artwork and symbols. A selected row does not cause neighboring neutral actions to adopt an unrelated status color.

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

Compact shows course rows only, Expanded shows course and topic rows with short published schedule summaries, and Detailed shows all guidance. Course List, Think Tank and My Plan use the same labels. Each planning surface saves its own choice; the default for a new preference is Expanded.

A member may click a title or info icon for one course or topic without changing their saved display mode. Detailed guidance appears directly on that item, not behind another "Description & tips" row. Scheduling summaries are descriptive only and never replace the exact grade-specific recommendation text (including placement and teacher-attention symbols), which stays available on demand.

