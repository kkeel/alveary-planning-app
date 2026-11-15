# My Plan: compact arrangement summary and local Students close

Applies to the 2027–28 Alveary Planning App development preview. This change is UI-only and does not rewrite saved priorities, arrangements, course assignments, or student records.

## Changes in this PR
- In each collapsed My Plan course summary, list student names separated by a slash. An explicit **Combined** arrangement uses the existing overlapping-circles placement mark immediately after that student's name, rather than spelling out `Combined`.
- **Separate** and **Later** both show the plain name. They retain distinct saved values, but the summary does not repeat those words. An explicitly chosen priority (Core / High Interest / Additional) still appears.
- The existing shared-topic ↔ marker remains its own distinct signifier and is **not** replaced by overlapping circles.
- In a combined course, the *open* course-level Students editor displays a clickable **Students** heading with a small X. Clicking this heading closes **only that editor**; it never collapses the course or its topic list. The row's existing students icon remains an alternative way to reopen it.
- Standalone single-topic course editors keep their usual heading; topic-level editors continue to open/close via their **in-row students icon**. No new topic accordion toggle.

## Topic-level priority and arrangement — separate persistent feature
This PR deliberately does **not** add non-saving controls. The current year-plan API stores preferences in `plan_course_students` (course + student). The topic checkbox editor stores `plan_topic_student_overrides` (course + topic edition + student + assigned); preferences currently do not exist there.

For the next implementation, add a distinct, private, persistent topic-preference record keyed by **year-plan course choice + linked topic edition + student** so shared topics included in different courses cannot silently overwrite one another. Preserve course priority/arrangement as the default, with opt-in per-topic overrides. Topic preference edits must never convert an inherited assignment into a fixed topic-assignment override.

- When **one student** is assigned to the topic, show optional Priority and Arrangement after that student's assignment/source row.
- When **multiple students** are assigned, let each have their own values, and provide an optional **Apply to selected students** shortcut to avoid repeating identical choices. Only show settings for students effectively assigned in that originating course grouping.
- Allow “Use course setting” for both values (inheritance). The selectable arrangement choices remain Combined / Separate / Later; do not add Both back.
- Keep the actual topic student editor opened and closed by the **row-level Students icon**. Do not introduce a second collapsible heading inside it.
- Retain share provenance: one topic edition may appear in several planned course groupings, and preferences must follow the specific saved course-topic-student association.
- Show later/undecided values as plain student names in summaries; overlapping circles only for an explicit or inherited Combined arrangement.
- Add secure backend operations, snapshot validation, optimistic updates, and tests before presenting these as working saved controls. Do not mutate the live 2026–27 member app.

## Browser checks
1. In Life Skills, Combined students show the overlapping-circles mark, while Separate and Later show just their names, with slash separators. An explicit priority still shows.
2. For Citizenship Grade 7, expand the course then click its students icon. After the topic list, click **Students** beside its X. The student editor closes; the course and topics remain expanded.
3. Reopen the course-level editor from the row icon, then close it again using that same icon.
4. Expand an individual topic editor. Only its own in-row icon closes it; the new course-level heading action must not change this behavior.
5. Check mobile Planning Desk widths and keyboard accessibility. No assignment or preference should change merely from opening/closing an editor.
