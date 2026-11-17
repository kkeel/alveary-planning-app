# Empty Planning Desk states — November 17, 2026

The mini Planning Desk's course lists deliberately use a full-bleed scrolling
body, while section headings receive their own inset. The previous *empty*
text did not have that inset, causing its first line and the My Plan CTA to
sit against or outside the frame at narrow widths.

## Updated zero-selection experience

- **Think Tank (0):** "Your Think Tank is empty" and a short instruction to
  browse the Course List and select a **lightbulb** on a course or topic.
  Removes the retired "bookmark" instruction.
- **My Plan (0):** "Your plan starts here" and a short instruction that
  choosing students for a course/topic makes it appear in My Plan.
- Both provide a **Browse courses** link taking the member to the current
  Course List in browse/list mode, instead of linking to another empty tab.
- In the mobile drawer, activating the action also **closes the drawer**.
- Hide the generic intro while empty to avoid doubling the guidance.
- A single `pd-empty-state` class uses readable 12–13px type, restrained
  action button, content wrapping, and explicit box-sizing and width.
  The mini/drawer desk gets an **18px inset** to counter the deliberately
  negative margin of its full-bleed scroll body. The full-page two-column
  Planning view retains its regular column padding.
- The existing loading/error placeholder is inset in the mini desk as well.

No changes to course/subject list styling, topic editing, saved member
selections, Supabase, Airtable, or live 2026–27 publication logic.

## Review in browser

1. Reset the demo course plan so **both counters are 0**.
2. Open the mini Planning Desk on desktop; select Think Tank and My Plan.
   All text and the CTA should be legible, comfortably inside both sides of
   the border, without a horizontal scrollbar or a duplicate introduction.
3. Narrow the Course List until the Planning Desk becomes a mobile drawer,
   then check both tabs again. The action should close the drawer, show the
   Course List and switch to List mode.
4. Visit Books with an empty plan, use **Browse courses** in the portable desk,
   and verify navigation to the Course List.
5. Enter full Planning mode with no selections: both columns should have
   the same concise empty messages, without their portable inset being
   doubled.
6. Save a Think Tank idea and assign a course to a student. Confirm the
   normal list/accordion/subject-rail behavior remains unchanged.

Automated source regression: `tests/planning-desk-empty-states.test.mjs`
(included in `prebuild`).
