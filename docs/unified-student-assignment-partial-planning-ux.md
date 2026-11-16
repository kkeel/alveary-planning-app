# Shared student assignment UX and partially planned combined courses

Applies only to the 2027–28 development app. No private user data was migrated.

## Behavior

**One student editor** is reused for whole-course and single-topic assignments.
Every entry point presents Students, name checkboxes, Family/group shortcuts,
inline + Add student, and a top-right **Done**. The topic editor calls
`assignTopic(parentCourseId, topicId, studentId, checked)`; the course editor
calls `assignStudents(parentCourseId, studentIds, checked)`. A topic assignment
never expands into the entire combined course. Group shortcuts have the same
scope as the clicked button. Done closes the editor promptly; changes save
automatically through the existing serialized secure Demo API.

- In Think Tank, a combined-course button reads **+ All**; a single-topic
  course has an icon-only **+**, matching the nested topic **+**.
- The + All student editor opens **immediately below** + All, above the
  combined course's topics. All editors have top-right Done, including
  My Plan student and topic editing.
- Nested rows keep the clickable title and info symbol for descriptions.
  Only Info, Add/Edit Students and More stay visible; **More** contains
  View Books and Remove/Restore. This preserves the actions while reducing
  crowding on the portable desk.
- When one included topic receives at least one student, **the same parent
  course stays in Think Tank** for its other unassigned included topics
  while appearing in My Plan for the assigned topic. Think Tank shows only
  topics still needing a student, My Plan shows topics already assigned.
  Excluded topics remain separately listed under Restore. Any course with
  all included topics assigned no longer appears in Think Tank after Done.
- The currently open topic remains visible until Done, even immediately
  after its first assignment. This avoids collapsing the active editor mid-click.
- Course-level preferences remain optional. Per-topic priorities are future
  work and have not been fabricated as saved controls. Topic editors omit
  whole-course priority/arrangement settings.

## Definition of a partially planned course

An included topic is in My Plan when at least one student has a *positive
effective assignment under that saved parent course*. Otherwise, it remains
available in Think Tank. These are complementary **views of one saved choice**,
not duplicated course records. The current definition is across the family:
a topic assigned to AJ is considered in My Plan even if Troy hasn't been
assigned that topic. Topic-by-student planning remains editable in My Plan.

## Acceptance

1. From Think Tank choose a combined History course. + All opens the same
   compact editor **above the topics**. Assign students or groups and click
   Done at the top; the editor closes without scrolling to the bottom.
2. Choose only U.S. History for AJ in Grade 9 History. The active editor
   stays open after checking AJ; Done closes it. Think Tank retains the
   Grade 9 parent with Ancient/World History; My Plan shows the same parent
   with U.S. History and AJ · 1 of 3 topics.
3. In Grade 10–12 History assign Troy the exact same U.S. History edition.
   Both parents retain independent student assignments.
4. Edit a planned topic: student chips, group shortcuts, inline Add student
   and top Done match + All and single-topic-course editing. Unchecking one
   student does not change others or different parent courses.
5. Remove/restore a topic from the new More menu. Description still opens
   from either the title or Info. View Books works from More.
6. A single-topic course uses plain +, not + Plan. Verify complete
   combined-course assignment removes it from Think Tank after Done.
7. Verify sign-out and signed-out public Explore cannot access students.
   Refresh to confirm choices and grade/country filters persist as before.

Regression assertions are in `tests/course-topic-provenance.test.mjs`,
run by the PR's standard Next.js build. Interactive browser QA remains
necessary before merging.
