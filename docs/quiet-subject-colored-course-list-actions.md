# Calm icon-only Course List actions and original subject colors

**Scope:** New 2027–28 Alveary Planning development app. No Supabase schema
changes, authentication adjustments, or 2026–27 planner modifications.

## Design

Member List and public Explore remain the same curriculum dataset with
Expanded / Compact browsing. The action region uses small, consistently
placed controls rather than long Think Tank / Plan / Students buttons.

- **View ⓘ / Hide ⓘ** toggles each record's description and additional
  information. The course/topic title is still clickable to do the same.
  When no detail exists, the Info action is omitted.
- **Lightbulb** adds an unselected parent course (or nested topic's parent)
  to Think Tank. After saving, the bulb is subject-colored. Once a course or
  topic becomes planned, its bulb becomes neutral again. The List does not
  remove saved courses or edit previously chosen students: those actions are
  in the portable or full Planning Desk.
- **+ / +All** starts the existing shared student assignment editor for a
  first-time assignment. Single-topic courses and nested topics use **+**,
  combined course parents use **+All**. The action stays visibly colored
  once planned, but will not reopen an assignment editor after the original
  selection. Edit students, groups, priority and arrangement from Planning.
  A new, not-yet-assigned *different topic* may still start its first
  assignment from List, but an already-assigned topic cannot be edited there.
- **Topics** appears as a small heading above the combined course's nested
  topic list whenever its details are expanded.

## Original subject palette

Exact colors are imported from the legacy
`kkeel/course-picker/js/app.js` `subjectColors` mapping, rather than new
approximations: Architecture #a0a6be, Art #907061, Bible #964945,
Citizenship #62765c, English #9b5b7b, Geography #4d8da2,
History #6b6bbf, Latin #5a5373, Life Skills #d1b358,
Literature #c07669, Math #6d7eaa, Modern Language #6db4b2,
Music #9e6bac, Physical Education #bd855e, Science #96a767.
Alternative Science uses Science's color; Basic Supplies retains #5A5D66.
Unmapped subjects use a neutral green fallback.

Visual hierarchy follows the previous planner:

- **Directly chosen course / topic:** saturated subject-colored selection.
- **Whole combined course +All:** parent saturated; child topics inherited
  from the whole-course assignment use a lighter shade.
- **Only one or some topics chosen:** that topic is saturated while its
  parent course is lighter to show partial planning.
- **Unassigned:** neutral. Included unassigned children in a partial plan
  remain available through their colored Think Tank bulbs.
- **Excluded topic:** neutral and nonassignable from List until restored
  in Planning, rather than incorrectly appearing selected.
- **Same source topic, two parent courses:** each row derives status from
  its *own saved parent course*; selecting U.S. History through History
  Grade 9 does not change the state shown under Grades 10–12.

These are visual states only. The existing secure student assignment and
combined-course provenance semantics are unchanged. Subject coloration is
also restricted to signed-in member selection states; public Explore is
neutral and read-only.

## Browser acceptance

1. In public Explore, use View ⓘ and Hide ⓘ on courses and topics; they
   should open and close the same descriptions as clicking their titles.
   No private lightbulb or plus actions appear.
2. In member List, verify unselected Literature, History, Math etc. rows
   have neutral controls and no student-edit button.
3. Save an unselected Literature course using its lightbulb; check the
   bulb becomes its original coral color while + stays neutral.
4. Use + / +All to assign one or more students to a saved idea; Done
   closes the initial editor. Verify the bulb becomes neutral and the
   selected plus turns saturated. Clicking it afterward does not edit
   students; edit in the portable desk or full Planning.
5. In History Grade 9, plan only U.S. History for AJ. U.S. History's +
   is saturated purple, the combined parent +All is lighter purple,
   Ancient/World remain available in Think Tank and can be assigned.
6. Plan all topics of a different combined course for Troy; its +All is
   saturated, and its child topic selections have a lighter inherited
   purple (or the appropriate subject color).
7. With U.S. History assigned under History Grade 9 and independently
   under History Grades 10–12, changing the first assignment from
   Planning must not recolor the second context incorrectly.
8. Exclude a child topic in Planning and confirm the List gives it a
   neutral selection and requires restoration before assignment.
9. Expand a combined course and confirm the small Topics heading appears,
   like the Think Tank/My Plan topic sections.
10. Test mobile List: the compact icons stay beside their titles without
    crowding or overlapping; the initial student editor remains usable.
    Print mode excludes the buttons and editor.

Automated regression coverage for original palette and parent/topic status
lives in `tests/course-list-subject-state.test.mjs`, run in prebuild.
Manual browser checks remain necessary before merging.
