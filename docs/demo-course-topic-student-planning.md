# Saved Demo course choices, group assignments and topic-level units

## Data model (2027–28 Demo)

- `plan_course_choices` stores one selected parent course or independently saved topic per year plan and catalog release. `stage` distinguishes Think Tank ideas from My Plan selections. Repeated bookmarks cannot duplicate a parent choice.
- `plan_course_topics` stores **every explicit child edition** under its parent, including topics that a family excludes (`included=false`). This guarantees stable source edition IDs for individual scheduling, printing and Syllabird.
- For a single-topic course or separately saved Topic, the edition itself is the single operational topic. No combined-course wrapper is invented.
- `plan_course_students` records **one click** assigning a selected parent course to a student. The assigned units are a derivation of that one link joined to the included child topic editions; changing the included topics immediately changes the effective set without duplicating group records.
- `plan_topic_student_overrides` records optional student-specific exceptions for a topic. A new group-level assignment clears a student's exceptions for that course, restoring the complete included set.
- `plan_effective_student_topics` is the downstream read contract. Each row identifies the workspace, year, selected group, source parent plan ID, source *topic edition and plan IDs*, student, catalog release, and topic order. It is protected by invoker rights and direct browser privilege revocation. Export integrations can use individual topic identifiers while user interfaces retain course group provenance. When a topic is selected through two parents, retain both provenance rows and **deduplicate downstream only with an explicit policy**, never silently at the database layer.

## API security / performance

The `demo-course-planning` Edge Function validates the Supabase JWT, the account's trusted Memberstack OIDC subject and current-year Demo entitlement via `memberstack-plan-access` (short server-only verification cache). It derives the workspace from the verified subject and invokes the service-role-only `demo_plan_apply` RPC, which provisions/reuses the family workspace and applies all changes in a single transaction. All new tables have RLS enabled, zero browser grants, and no client permissions for the atomic function.

Actions: load, import legacy ideas, set/remove choice, move between idea and planned, include/exclude topic, assign/unassign combined course to student, assign/unassign an individual topic. No client-supplied workspace, year, member ID or role is trusted.

## Browser Think Tank preservation

The previously selected Think Tank items, notes, ordering and excluded topics remain in local browser storage. On initial authorized load, Supabase choices are shown as part of the existing Think Tank. If there are browser-only choices, a **manual merge button** sends those course IDs and excluded topic plan IDs for secure validation/import. The import is idempotent and never overwrites an existing saved choice. Old choices are not cleared before confirmation.

After merge, new bookmarks and topic customization writes are optimistic and serialized via the shared DemoPlanContext. The My Plan tab supports promotion and student assignments. New user browsers load choices from Supabase. Browser notes and view arrangements are still local pending a separate preferences rollout.

## QA checklist

1. Sign into Demo with Testing Plan; open Courses. Existing local bookmarks must remain visible.
2. Use **Save browser ideas to Demo plan**. Confirm original courses and exclusions are preserved. Repeat the import to verify no duplicates.
3. Refresh / sign out and back in / open a different browser: imported course choices should reappear.
4. Move a combined course from Think Tank to My Plan. Assign one student via parent checkbox. Open topic details and verify all included topics are assigned.
5. Exclude one topic: that topic is not assigned, while other topics remain assigned. Restore it and verify assignment returns.
6. Set an individual topic/student exception. Verify the other students and topics are unaffected. Use **Reapply all** to restore the full group assignment.
7. Assign one combined course to several students, and a single-topic course to one student; verify each relationship.
8. Sign out or remove Testing Plan: direct API access must fail closed and private plan records never become public.
9. Monitor server latency and API call counts. Existing Students, previous-year Alveary tools and browser notes must remain unchanged.

Development SQL tests completed for group assignment, topic exclusions/restoration, per-student overrides, idempotent legacy import, and RLS/service-role privileges inside rolled-back transactions. Real interactive acceptance remains necessary.
