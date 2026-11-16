# Edit a shared topic's students from any saved parent course

## Member feedback

The existing ↔ AJ marker under a shared topic reported that another saved
course had assigned AJ, but the local + / Students editor allowed changing
only the clicked parent. Members had to locate and open the other course
separately, despite knowing that the same topic edition was reused.

## New behavior

When an included topic edition is present in **two or more saved parent
courses**, opening + (Think Tank) or Students (My Plan) shows a compact
**Edit students in course context** selector above the familiar shared
student editor.

- The starting selection is always the clicked parent course.
- The dropdown includes all already saved, included course contexts of the
  *same exact topic edition*, not topics with similar names.
- Each choice names the parent course and lists students already effectively
  assigned there. A saved Think Tank parent is labeled as such.
- Switching the dropdown does **not** save or move any assignment. It only
  changes which parent course's students, priorities and arrangements the
  unified editor will edit.
- All, groups, individual student checkboxes, + Add student, Advanced
  assignment, Cancel/Close and Done remain the same UI in every context.
- Student checkboxes, course defaults and topic overrides write through the
  existing secure serialized Demo operations using the selected parent
  course, its own topic link and the chosen student. No cross-parent write.
- Done in the Think Tank can promote an already-checked idea in the
  *selected* source parent, and focus My Plan on that parent, even if it is
  not the one the editor was originally opened from.
- A topic excluded from another parent is not offered for cross-context
  editing; restore it inside its own course first.
- An unsaved catalog-only parent is not offered. Save that course to Think
  Tank before editing it. The selector is absent when there is only one
  saved eligible parent so routine assignments remain as simple as before.

This reuses the same StudentAssignmentEditor and does not introduce a
separate student editor or change database assignment semantics.

## Browser acceptance

1. Save History: Grade 9 (U.S.) and History: Grades 10–12 (U.S.) as
   separate parent courses. Assign AJ only U.S. History in Grade 9, and Troy
   only U.S. History in Grades 10–12.
2. From the Grade 9 topic, click Students / +; confirm the selector lists
   **both parents** with AJ and Troy under their respective sources.
3. Switch to Grades 10–12, select Hannah and remove Troy. Confirm Grade 9
   still has AJ assigned, while Grades 10–12 now has Hannah.
4. Switch back to Grade 9 and adjust AJ's *course default* priority and
   *topic override*. Then inspect Troy/Hannah's parent: it must retain its
   own priority/arrangement settings.
5. Use + Add student while editing the other parent; confirm the new
   student appears in all student lists but is not assigned to either
   parent until its checkbox is selected.
6. Exclude U.S. History from one course: that parent is no longer a valid
   context for that edition. After restoring it, the parent reappears.
7. With only one saved parent, check that no extra selector appears.
8. Verify the compact Planning Desk and full-page Planning, including
   small screens, keyboard labels, Done and automatic save/refresh.
9. Verify that the public Explore catalog remains read-only, and that
   existing 2026–27 planner and Supabase schema are untouched.

Automated regression tests use the two real History parent editions,
their shared U.S. History topic edition and independent AJ/Troy/Hannah
assignments, exclusions and source matching.
