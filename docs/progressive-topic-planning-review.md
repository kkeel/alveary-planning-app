# Progressive topic planning and student review — 2027–28 Demo

## Design contract

The Planning Desk's Think Tank and My Plan now share one nested **CourseTopicReview** component. A combined course is an organizational parent; **each catalog topic edition is an independent operational unit** for scheduling, PDFs and Syllabird.

- **My Plan default:** a compact subject/course list with student summary; no expanded student editing.
- **Small reveals:** an independent information icon opens separate Description and Placement/Combining Tips disclosures; opening a course shows its familiar nested topics, where individual descriptions and tips unfold one topic at a time.
- **No duplicated topic editor:** Include/Remove/Restore is on the nested topic row itself. Its student-specific exceptions appear only after opening the topic and requesting "Edit students for this topic." No secondary "Adjust individual topics" panel below the list.
- **Cross-course reuse:** for any topic edition, an inline note shows other *planned* course groupings and the other student assignments for the same edition in this family/year. It computes from the existing private, authorized in-memory Demo plan snapshot; no cross-family lookup, public query or extra request.
- **Think Tank choice:** "Plan all included topics" promotes the combined-course choice and opens the student editor in place; opening one nested topic reveals "Plan this topic," which creates or promotes a standalone choice for that topic and leaves the original combined-course idea alone.
- **Done:** after promoting and/or assigning the parent course, "Done" ends the in-place workflow and removes the promoted course from Think Tank; saved choices and assignments remain in Supabase. After planning a standalone nested topic, Done closes that topic editor; the parent remains a Think Tank idea since only that topic was moved.
- **Student controls:** assignment and optional priorities/arrangements stay collapsed until explicitly opened. The editor has a small Add Student form (nickname + optional grade), which uses the **existing secured demo-students Edge Function**, then reloads the shared saved-plan student roster.
- **Students page:** shows only name/grade by default, and an optional collapsed count/list of planned course groupings for each student. Uses the same authorized shared Demo plan to show inline-added students immediately, while still refreshing its own private API.

## Storage and access

No changes were required to the course/parent/topic/assignment schema, family workspace or member entitlement rules. The plan context uses the existing per-user serialized optimistic mutation queue. Topic-only promotion uses the existing atomic `set_choice` action with `stage=planned`, and subsequent assignments use `batch_assign` under the same authenticated Demo membership. The original current-year Alveary planning site is untouched.

No routine saving-status paragraph is injected in the course list; the existing fixed-header status shows Saving/Saved/Not saved without reflow.

## Acceptance checklist

1. Open a combined course in My Plan; only nested topics appear, not an assignment form. Open each topic to inspect its description and tips; Remove/Restore works without duplicate controls.
2. Open Description / Placement Tips independently via the row's information icon, without opening Edit Students.
3. Check "Also in this family's plan" on a topic shared between two planned course groupings; verify names reflect current assignments, not merely catalog overlap.
4. In Think Tank, plan one nested topic separately, assign a student, click Done, and confirm the standalone topic appears in My Plan while the combined-course idea remains in Think Tank.
5. Plan an entire combined course, assign Family or a named group, click Done; the whole parent moves from Think Tank into My Plan without auto-scrolling to its new location.
6. Use Edit Students in the expanded My Plan course, add a student with nickname/optional grade, and verify the student appears on the Students page immediately and persists after refresh.
7. On Students page open the small course summary; only the student's effective planned assignments appear.
8. Verify sign-out and unauthorized accounts cannot see student names, saved family choices or cross-course topic usage.
9. Confirm the saved 2027–28 Demo choices and existing student assignments have not changed during deployment.

No destructive import, migration, or automatic regrouping is performed in this release.
