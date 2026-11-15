# Planning Desk: compact controls and shared-topic editing

Scope: 2027–28 Demo user interface. No changes to current-year site, Memberstack, Supabase schema or saved family data.

## Preserved
- My Plan's Description & tips, course book icon, student editing, inline Add student, priority/arrangement controls.
- Think Tank/ My Plan combined-course topic structure, user-saved exclusions, family-group shortcuts and topic-edition identity.

## Changes
- The course-level **↔** sits directly after the student summary, not beside the course title.
- Placement and combining tips are displayed as an icon followed immediately by the tip, not as a heading over the text. Applies both at course and topic level.
- Topic-level **↔** appears below the topic name and lists *only students'* names from other planned course groupings. The full source-course relationship is presented in the student editor.
- Each topic row has a separate info icon for description/tips, a book icon, a compact **+** to plan only that topic (without opening details), and a compact exclude/restore icon.
- An expanded planned topic has an opt-in student edit control. The editor shows **all students** and all planned course groupings that include the same source topic edition; each checkbox is scoped to its explicit originating course. This uses the existing authorized **set_topic_student** API and preserves group-level course assignments as overrides.
- The parent course button is compact **+ All** for combined courses or **+ Plan** for single-topic choices. Opening the editor does **not** promote the parent; only assigning a student does. **Done** appears only while the editor is visible AND at least one student is assigned; hiding the editor hides Done.
- The course-level **Description & tips** disclosure appears only after expanding the My Plan course. Think Tank descriptions stay visible automatically.
- The Planning Desk header has an Expand/Regular-width toggle. The expanded desk is a wider, docked panel that does not consume the whole page. Narrow-browser width follows the existing floating drawer pattern.
- Book icons for course and topic retain the source course ID in the URL as a forward-compatible query parameter. **The Books page remains a placeholder until course-specific filtering is implemented**; do not claim contextual book filtering works yet.

## Manual browser acceptance
1. ↔ is beside assigned students in My Plan, never beside the title.
2. ↔ under a topic lists just names and disappears when there is no actual shared assignment.
3. The topic Edit students panel identifies originating combined courses, permits editing effective student assignment in each, and does not accidentally delete entire combined-course selections.
4. Single topic + is accessible without expanding the topic; My Plan is not populated accidentally without students.
5. + All -> Hide before selecting a student never shows Done or moves course to My Plan.
6. Description/tips placement is identical in Think Tank and My Plan but the toggle exists only inside expanded My Plan.
7. Book icon at both course and topic levels; the Books page is still a placeholder.
8. Wider desk and reset work at desktop and floating drawer widths. No overlap or full-page takeover.
9. No course, group, student, or permission data changes.

Build + post-merge deployment must pass before inviting user acceptance testing.
