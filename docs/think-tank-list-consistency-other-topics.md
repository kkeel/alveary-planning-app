# Think Tank mirrors the Course List — toolbar, white detail review, Other topics

**Scope:** 2027–28 demo planning. This PR is a UI refinement only and uses
the existing secured per-parent planning API. The previous 2026–27 live
planner, catalog data, Memberstack, assignments, priorities, and arrangements
are unchanged.

## Expanded Think Tank
The course title row now carries the action toolbar in Course List order:
**ⓘ**, **books**, **+ / +All**, **…**. Clicking the title or ⓘ opens/closes
the record, without a redundant extra chevron beside ⓘ. Clicking ⓘ also
opens the record's **Description & tips** the first time. The matching
Description & tips disclosure remains available inside, just as in My Plan.
Clicking +/+All reveals the existing shared student assignment editor above
the topic list. Overflow retains **Remove from Think Tank**.

Course expansion uses a white background, with no green left-hand rules.
Descriptions use ordinary dark text. Placement/combining tips use the same
neutral blue-gray callout as the Course List rather than a green-on-green
panel. The Think Tank subject headers retain their faint subject colors.
The same changes apply in portable and full-page Think Tank.

## Partial course counts
For combined courses, if a column displays fewer than all published topics,
the course title has a plain secondary line **`N of M topics`**:
- A single selected topic in Think Tank is **1 of M**, not merely the number
  of topics still included.
- A customized whole-course idea with excluded topics is **included N of M**.
- A partial My Plan shows the number of actually assigned topics in that
  saved parent, not the number of included catalog topics.
- A full whole-course selection shows no count.
The old `Customized · ...` label is removed from these Planning Desk views.
The course catalog and Course List remain unchanged.

## Other topics
A combined course in Think Tank shows **Other topics (N)** whenever any
published topics are not currently selected for Think Tank—whether they
were never chosen or were excluded by course customization.

- Toggle **Other topics** open/closed to see all of them; each topic has its
  original title, contextual information ⓘ (if available), books, a Think
  Tank lightbulb (when unassigned), + for student assignment, and the
  overflow menu for including/excluding.
- **Lightbulb All** selects all still-unplanned other topics individually.
  It preserves originally direct topic selections and does **not** promote
  the whole parent, add students to sibling topics, or alter another
  course parent.
- A topic intentionally excluded from a course is re-included before it is
  considered or planned. If its existing course-wide Think Tank inheritance
  already makes it considered, there is no redundant toggle.
- A topic already assigned to students within this same saved parent is
  identified as in My Plan rather than getting an invalid duplicate
  Think Tank action.
- The existing selected topic's overflow menu can remove only that
  topic's Think Tank intent or separately exclude it from the curriculum.
  The course-level overflow **Remove** clears only the course's still-
  unplanned Think Tank ideas, never an already-assigned student or another
  saved course context.

This uses `idea_all`, per-topic `idea_choice`, and `included` as
distinct saved concepts; an omitted selection is not the same as an excluded
curriculum topic.

## Browser acceptance
1. Expand Language Study Grade 7 and a History course in portable Think Tank:
   white details with no green vertical rules; blue-gray tips, not green.
2. Course toolbar in compact view: ⓘ, books, +All, … . Open and close
   using the title or ⓘ. Confirm both outer ⓘ and the inner
   **Description & tips** reveal information and nested topics remain
   independently editable.
3. Add only U.S. History to Grade 9 History's Think Tank: title reads
   **1 of 3 topics** and Other topics shows Ancient/World.
4. Open Other topics, view descriptions, click a topic lightbulb,
   then click + on another and assign a student. The selected count,
   Think Tank and My Plan must update appropriately, without changing
   the unchosen sibling or Grades 10–12 parent.
5. Exclude an included topic with the overflow menu. It appears in
   Other topics, where selecting its lightbulb or + re-includes it safely.
   Test Lightbulb All for a mixed excluded/unselected set.
6. Plan all topics of a combined course: no partial topic count is shown.
   Remove/exclude one topic and verify the appropriate N-of-M count.
7. In My Plan, assign only a child topic: title count reflects assigned
   topics, not all included catalog topics.
8. Use Remove in Think Tank on a partially planned course. Assignments
   in My Plan and shared source editions in other course contexts must
   persist unchanged.
9. Verify mobile drawer, long course titles, keyboard focus, and full
   Planning view with both columns.

Regression: `tests/planning-topic-sections.test.mjs`, run in prebuild.
