# Full Planning page and My Plan parity with Think Tank

**2027–28 Planning app, November 17, 2026.** UI-only implementation:
no change to Airtable curriculum, Supabase schema, year routing, student
assignment operations, or the live 2026–27 planner.

## Full Planning page

- Keep the top **List | Planning** switch in Course List.
- Remove the redundant notebook + "Your Planning Desk" line below it.
- Remove **Expanded / Compact** switches from full-page Think Tank and My Plan.
- Keep user-controlled title/info disclosures; one open course per column,
  even when another course belongs to a different subject.

## My Plan should look and feel like Think Tank

- Subject sections inherit exactly the same palette variables: header wash,
  left header edge, and details-only subject-colored rail.
- Reuse **`pd-subject-items pd-think-course-list`** so rows are simple list
  entries with normal dividers, not cards.
- Reuse **`pd-review pd-think-review`** for open content: neutral review
  background, no tinted outline, no green-filled detail panel, and same
  description/tips controls and hover/focus states.
- Title or Info toggles the same course details. Opening another My Plan
  course closes the prior one in every subject. Preserve scroll anchor so
  expanding a new row doesn't yank the pointer.
- Keep My Plan's checkmark icon instead of Think Tank's lightbulb.
- Keep the already-authored student names, partial topic count, group/
  arrangement/priority metadata in every course's summary, and show the
  catalog's recommended schedule + grade in the expanded heading.
- Show assigned student names beside planned topics. Show schedule/grade
  metadata when a topic's info opens, and retain student checkmarks and
  per-topic editor checkboxes.
- Preserve shared-topic provenance, linked Books navigation, excluded
  topics, topic-specific priorities/arrangements, and existing saving logic.

## Actions

- In the course toolbar, replace Think Tank's `+` / `+ All` with the
  **Students edit** icon (UsersRound). It opens the **same**
  `StudentAssignmentEditor` used in Think Tank, but existing checkboxes
  and preferences are prepopulated. Closing the editor leaves the row
  disclosure open.
- Planned topics have their own Students edit icon and continue to use
  `SharedTopicStudentEditor`, preserving source-course choices and
  per-topic assignment semantics. Nothing is auto-assigned on opening.
- The course-level `...` toolbar action is the same neutral button as in
  Think Tank. Its inline action is **Return to Think Tank**. Do not leave a
  second Return action at the bottom of the expanded review.
- All existing changes still autosave; the editor's Cancel/Close/Done
  behavior remains unchanged. If a course becomes an idea after its last
  student is removed, keep the editor reachable until it closes.

## Manual browser acceptance

1. Open the full Planning page from **List | Planning**. No extra
   notebook/desk heading and no Expanded/Compact switches. Both
   Think Tank and My Plan columns have their own familiar headings.
2. With History in My Plan, expand one course. Confirm the schedule/grade
   metadata, student summary and topic count; no card border or filled
   detail background; subject-colored rail only beside expanded details.
3. Expand another course in the same subject and then in another subject.
   Only one My Plan course can remain expanded; scrolling stays stable.
   Course title and Info must both toggle the same disclosure.
4. Hover/focus subject heading, course title, Info, Books, Students and
   `...`. Only the focused target is tinted, just like Think Tank.
5. Open **Edit students** from the My Plan course header. Existing students
   are checked, preferences are editable, and Done/Close retains the
   course summary and list. Remove the last student and verify the
   editor remains reachable until dismissed.
6. Expand a planned combined course and a topic. Topic heading shows
   student names, info reveals original schedule/grade/description and
   shared topic markers. Topic Students opens the same shared-source
   editor, including existing student checkbox selections.
7. Open `...` on a course and choose **Return to Think Tank**; the
   course should leave My Plan and become an idea without losing its
   canonical course/topic identity or creating a duplicate.
8. Check portable Planning Desk tabs, narrow/mobile drawer, and the
   side-by-side full-page view. Verify Book links, status counts,
   checkmarks and other topic-management controls remain usable.

Automated checks: `tests/my-plan-think-tank-parity.test.mjs` plus updated
Think Tank hover/accordion and Planning Desk subject-stack tests.
