# Think Tank: one open course and clearer course boundaries

**Scope:** 2027–28 member Planning Desk only (portable mini desk and full
Planning page). No change to My Plan, course catalog List, saved assignments,
topic inclusion, Supabase, or live 2026–27 app.

## Visual structure

Within each subject, treat each Think Tank course as a lightweight neutral
card rather than one continuous white block divided only by hairlines:

- Give course cards their own very light outline and 10px vertical gap.
- Keep neutral white interiors; a currently opened card has a slightly
  more defined outline and a quiet header/detail divider.
- The **entire expanded area**, including Description & tips and Topics /
  Other topics, remains clearly inside the course's card.
- Do not use saturated subject fills for course outlines: subject color
  remains the wayfinding tint on the subject header.
- On narrow screens, reduce padding/gaps rather than making toolbar
  buttons overflow.
- The title and info have their own neutral hover. Topic identity
  lightbulbs/checkmarks remain paired with their titles; toolbar icons
  remain separately hovered.

## Global course accordion

There is **exactly one active Think Tank course ID** in the whole desk.
There is no per-subject expanded flag map.

- Open any course from title or info icon: a previously opened course
  closes automatically, even when the two are in different subjects.
- Click the same course again: it closes. The member can have **zero**
  courses expanded.
- Clicking + / +All to assign students opens that course and closes
  the previous one; existing optimistic assignment saving and editor
  Done/Cancel behavior are unchanged.
- Nested topic details inside the active course continue to use the
  existing one-topic-at-a-time behavior.
- Closing the subject that contains the active course also closes the
  course details. No hidden expanded panel should remain.
- The full Planning page's Think Tank **Expanded** choice now opens
  one course (or retains the current one), not Expand All; **Compact**
  closes it. Persisted older Expanded preferences initially open only
  the first course. The Course List and My Plan retain their existing
  independent detail-mode behavior.
- Clicking a different course should preserve that clicked course
  header's approximate on-screen position even if an earlier expanded
  card collapses above it.

## Browser acceptance

1. In **English**, add Language Study: Grade 7 and Grade 9 to Think
   Tank. Expand Grade 7, and confirm its Topics/Other topics visibly
   end inside its own bordered card with space before Grade 9.
2. Click Grade 9's title or ⓘ. Grade 7 closes, Grade 9 opens. Click
   Grade 9 again; both remain collapsed.
3. Expand a course in **English**, then expand one under **History**
   or another subject: English closes. Repeat from the mini desk and
   full Planning page.
4. With an earlier course expanded and a later one in view, click
   the later course. Its title should stay in view rather than jumping
   upward after the earlier card collapses.
5. Open a combined-course topic editor, select a student, use Advanced
   assignment and Done. Its topic row must remain stable until Done.
   Switch courses afterwards; previous editor is no longer shown but
   saved choices persist.
6. In full Planning, try Expanded/Compact. Expanded should open only
   one course, and should not silently re-expand other courses on
   subsequent clicks. Confirm other List/My Plan view switches are
   unchanged.
7. Check mobile drawer and desktop widths: metadata lines and long
   titles wrap, border outlines are visible, and no toolbar icon
   overlaps or acquires a whole-row hover.
8. Collapse the subject containing the currently open course, then
   reopen the subject: the course remains collapsed.

Regression test: `tests/think-tank-single-open-course.test.mjs`.
