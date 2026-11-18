# Planning icon buttons — shared design rules

This document covers the 2027–28 Alveary Course List, Think Tank, My Plan, and inline student editors. The central stylesheet is **`app/planning-icon-controls.css`**, imported by `app/layout.tsx` after global CSS. **Do not add separate icon-button size or neutral hover rules to individual components.**

## Sizes and spacing

| Placement | Square target | Typical glyph | Image artwork |
| --- | --- | --- | --- |
| Course List — course row | 34px | 18px | 21px |
| Course List — nested topic | 29px | 16px | 18px |
| Mini/full desk — course row | 30px | 17px | 20px |
| Mini/full desk — topic row | 27px | 15px | 18px |
| Student editor — shared toolbar | 30px | 18px | 20px |
| Student editor — per-student row | 28px | 17px | 19px |

At a narrow viewport (up to 760px), Course List controls reduce to **31px for courses** and **27px for topics**. This is a density adjustment, not a new behavior rule.

All actionable glyphs use `planning-icon-control` and take their square size from their nearest containing row. The priority and arrangement wrappers and the overflow `…` anchor occupy exactly one square slot. This avoids the mismatched tag/arrangement/info widths caused by earlier CSS layering.

The Course List **View/Hide + i** control is the only labeled exception: it shares the same height, icon, and focus behavior but remains wide enough for its word on desktop. On small screens, the word is hidden and the control becomes a square.

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
