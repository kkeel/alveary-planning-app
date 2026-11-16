# Automatically return unassigned topics/courses to Think Tank

## Intended 2027–28 Demo behavior

An effective student assignment is defined *within one saved parent course*
and one **included topic edition**. If a student is assigned to a whole
combined course, the student is effective for every included topic unless a
per-topic negative exception overrides that assignment. Positive topic
exceptions count even without a whole-course student link.

After a student is removed using any add/edit control (single student, All,
group/batch or shared-topic cross-course context selector):

- **Topic becomes empty inside its parent**: that topic is no longer listed
  in My Plan and becomes available in Think Tank under its *same* combined
  parent.
- **Parent still has other assigned included topics**: parent remains partly
  in both columns, with each column showing only its appropriate topics.
- **Parent has no assigned included topics**: automatically save that parent
  with `stage=idea`. It leaves My Plan and returns wholly to Think Tank.
- **Another parent uses the same source topic edition**: it keeps its own
  student assignments, stage, priority defaults, topic overrides and
  arrangements. No assignment migrates between parents or is removed in
  bulk.
- **More than one student uses a topic**: removing one leaves the topic in
  My Plan until the very last effective student is removed.
- **A topic is excluded**: if that was the last assigned included topic,
  its parent is demoted, but topic inclusion/override records are retained.
- **Already planned but unassigned courses from prior activity**: the
  migration does not bulk rewrite them. Automatic demotion runs when a
  relevant removal/exclusion action is made, not on sign-in or read.
- **Manual Return to Think Tank** continues working and may retain previous
  checked student choices as a draft. Demotion never implies a topic is
  newly assigned or unexpectedly promotes a manual draft.

## Implementation

Migration: `20261116183917_demo_demote_empty_parent_after_assignment_removal.sql`
(applied in the 2027–28 development Supabase project).

The service-role-only `demo_plan_demote_if_unassigned(uuid)` helper locks
the chosen parent course within the same transaction as the assignment
change, then checks for *any* active student effectively assigned to *any*
included topic. Only if none exist does it set that parent's stage to idea.

The existing authorized `demo_plan_apply` RPC calls it after a negative
`set_topic_student` or `set_course_student`, and after excluding a topic.
The existing `demo_plan_manage` RPC calls it after a negative
`batch_assign`. Positive assignments still promote to My Plan using
the original behavior. Public/browser RPC privileges are not expanded.

The client uses the matching pure `demoteIfNoAssignedTopics` helper for
optimistic state, while Supabase remains authoritative. Saved choices,
student/group records, priority/arrangement overrides, and topic exclusions
are not wiped by this change.

To avoid the editor vanishing mid-click, My Plan keeps an empty parent
temporarily visible **only while its course-level or topic-level student
editor is active**. Done or Close/Cancel releases it, at which point the
course appears exclusively in Think Tank. If other topics stay assigned,
the parent continues appearing partially in both views.

## Acceptance scenarios

1. Add AJ to U.S. History in Grade 9 History and Troy to the same edition
   in History Grades 10–12. Remove AJ from Grade 9 via the shared-topic
   editor. Done. Grade 9 returns to Think Tank, but Grades 10–12 remains
   in My Plan with Troy's U.S. History. Refresh to verify persistence.
2. Add AJ to Grade 9 U.S. History **and** Hannah to its World History.
   Remove AJ from U.S. History; Grade 9 remains partly planned with
   World History, while U.S. History is back in Think Tank.
3. Add two students to one topic. Remove one: it stays in My Plan;
   remove the last: the topic returns to Think Tank.
4. Assign a combined course using All, then remove its last
   whole-course student. Its included topics return to Think Tank;
   another combined course's shared topic assignments stay untouched.
5. Exclude the only assigned topic and check that no other topics
   are accidentally promoted. Restore and reassign when desired.
6. Use **Done/Close** after last student removal and verify My Plan
   doesn't retain an empty course; while editing, the buttons remain
   available to finish or change your mind.
7. Refresh or sign in again. Topic priorities, course defaults,
   arrangements and topic exclusions remain unchanged.
8. Confirm both the portable desk and full page Planning work, and
   public Explore cannot access private assignments.

Automated Node regressions use the real two-parent U.S. History example,
multiple students, several included topics, All/batch semantics,
exclusions and manually parked Think Tank drafts. Browser acceptance
is still necessary after merging.
