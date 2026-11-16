# Consistent student assignments and independent course/topic priorities

Scope: 2027–28 Demo Planning only. This PR does NOT modify the live 2026–27 planner, current curriculum catalog, member entitlement rules, or already-saved assignments.

## Layout and controls

- Every saved-course and included-topic **+ / students icon** opens the same `StudentAssignmentEditor`.
- The quick **All [count]** and named group shortcuts appear before the individual student checkboxes, rather than being called Family and appearing below them.
- An editor opened from **My Plan** on a combined course appears **above its topic list**, like the + All editor in Think Tank. Topic-level editors still appear beneath their own topic.
- Each editor has Add student, Cancel/Close, Done and a collapsed **Advanced assignment** section.
- The advanced section supports course defaults and topic overrides for the selected students, while keeping arrangement a whole-course choice.

## Priority inheritance

A **course priority** is the default for that student throughout the saved parent. A topic **inherits** it until explicitly overridden.

Example within History: Grade 9 (U.S.) for AJ:

- Course default = Core.
- U.S. History = Use course default → effective Core.
- World History = Use course default → effective Core.
- Ancient History = Additional → effective Additional.
- A topic can also explicitly be Not set even if its parent default is Core. Choosing **Use course default** deletes that override and resumes inheritance.
- Troy's priorities in History: Grades 10–12 (U.S.) remain entirely separate, even when the same U.S. History source edition is shared.

A priority does **not** assign or remove a topic. The saved priority layer is separate from `plan_course_students` and `plan_topic_student_overrides`; changing between partial/whole-course assignments or moving the parent between Think Tank and My Plan must not discard custom priorities.

## Database and security

Already applied in the **2027–28 development Supabase project**:

- `plan_assignment_priorities` (FKs for workspace+parent+student, optional exact source topic edition); partial unique indexes for course defaults and topic overrides.
- RLS enabled with no browser policies and direct `anon`/`authenticated` table permissions revoked. Only the service role may access via `demo_plan_priorities`, a SECURITY INVOKER RPC with explicit identity, active workspace role, year-plan, student enrollment and parent/topic validation.
- Backfilled existing Demo course priorities without modifying existing arrangements. Current legacy course-priority values remain for backward compatibility but new UI reads the independent priority data.
- The existing `demo-course-planning` Edge Function (JWT validation + current Memberstack entitlement check) now returns `assignmentPriorities` with every snapshot and accepts `set_assignment_priority` via the private RPC. No direct browser SQL access was added.
- Migration file is `supabase/migrations/20261116171437_demo_topic_course_priority_inheritance.sql`.

## Browser acceptance tests

1. In Think Tank assign AJ only U.S. History from Grade 9 History, expand Advanced assignment, set course default Core, then set U.S. History Additional. Finish and refresh. Grade 9 History remains one saved parent shared between columns; AJ's priority selections persist.
2. Open the same Grade 9 parent in My Plan. Its **course-level student editor appears above the topics**. Change AJ's course default to High Interest and see other inherited topics follow; U.S. History keeps its explicit Additional priority.
3. In the U.S. History topic editor select **Use course default** for AJ. Effective priority now becomes High Interest; refresh to verify. Then select explicit Not set and verify it no longer inherits.
4. Add Troy to the same U.S. History edition through History Grades 10–12, set a different course default, and verify AJ is unaffected.
5. Select **All [3]** at the top of an editor and confirm all students are assigned only within that editor's scope (whole course for + All; individual topic for nested +). Named groups remain alongside All. Individual student checkboxes come afterwards.
6. Edit arrangements from a whole-course student editor; the previous arrangement persists separately from priority. Topic-first students can adjust their course default and topic override without being assigned the entire combined course.
7. Switch an AJ topic-only assignment into + All, then back to only selected topics. Verify priority values persist without creating standalone topics or changing other students.
8. On mobile, verify quick shortcuts, Add student, Advanced assignment, Cancel/Close and Done do not overlap.
9. Sign out and return; priorities are not publicly visible. Check the same account on another browser; priorities follow the authenticated workspace.

## Automated checks

`tests/course-topic-provenance.test.mjs` tests inheritance, explicit Not set, override removal, AJ/Troy sharing independence and existing topic membership rules. It runs in the standard prebuild. Browser end-to-end testing is still necessary before considering the UX verified.

## Later polish

Priority labels are currently text inside the controls. The original Core, High Interest and Additional artwork will be integrated as consistent visual chips once image assets are available in the new app; this PR does not claim that asset work is completed.
