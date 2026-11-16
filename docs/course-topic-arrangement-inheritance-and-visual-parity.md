# Course/topic arrangement inheritance and consistent course-title metadata

Applies only to **2027–28 Demo Planning**. The live 2026–27 planner, member entitlements and curriculum catalog are unchanged.

## Shared arrangement behavior

A student may set a **course default arrangement** (Combined, Separate, or Decide later) in the same Advanced assignment section used for priorities. A topic may separately select:

- **Use course default**, which saves no topic override; its effective arrangement follows the parent's chosen value.
- **Combined** or **Separate**, which overrides the parent for this student and topic only.
- **Decide later**, an explicit override useful when the course default is Combined but this topic is still undecided.

Example: AJ's Grade 9 History course defaults to Combined, U.S. History inherits Combined, and Ancient History overrides to Separate. Changing the course default to Separate only changes topics that still inherit the default; Troy's Grades 10–12 History arrangements remain independent, even where they share the same U.S. History edition.

Unlike a course-wide student assignment, setting a course default arrangement from a **nested topic editor does not assign the rest of the course**. Arrangement choices are retained through topic-only versus whole-course assignment changes and through Think Tank/My Plan moves. As with priority, they are per student and saved parent course. No existing assignments are rewritten.

Older saved `Both` arrangements remain readable so members can choose a current value; **Both is not offered for new selections**.

## Private persistence

Applied to the development Supabase project in migration `20261116180055_demo_topic_course_arrangement_inheritance.sql`:

- `plan_assignment_arrangements` with separate course and topic scopes, FK ownership, active student checks and included-topic validation, and private RLS (no anon/authenticated direct grants).
- Existing 2027–28 Demo whole-course arrangements were copied as defaults; original `plan_course_students.arrangement` rows are left intact.
- `demo_plan_arrangements` SECURITY INVOKER RPC is callable only by service_role and verifies workspace owner identity, year plan, source course and topic edition.
- Deployed `demo-course-planning` Edge Function v4 uses its existing verified JWT + current Memberstack entitlement gate, adds `set_assignment_arrangement` and returns `assignmentArrangements` on all snapshots.
- A single serialized mutation queue supports optimistic updates and rollback on failure.
- The new independent arrangement table is authoritative for this Planning UI. The legacy arrangement field is retained for backwards compatibility while other future scheduling consumers are migrated.

## First visual parity improvement

Think Tank and My Plan reuse the same `CourseCustomizationNote` component. When included topics are fewer than a combined course's complete topic list, both columns place **Customized · 4 of 5 topics** directly **beside the course title**, rather than on a separate second line or beside student names. Student assignment summaries remain on their own line in My Plan.

This PR intentionally does not redesign subject groups, row menus, expansion state, sorting or the existing member-planning data model. It is the first focused step in making the two presentations feel consistent.

## Acceptance / regression

1. In a combined course, assign AJ to U.S. History. Under Advanced assignment choose **Course default arrangement: Combined** and **Arrangement for this topic: Use course default**. Finish, refresh and reopen: settings persist.
2. Open Ancient History in the same parent. Assign AJ if necessary and choose **Separate** for Ancient only; U.S. History remains Combined.
3. Change the course default to Separate; inherited topics follow; Ancient retains its explicit override. Then set U.S. History **Decide later** and verify it no longer inherits.
4. Choose **Use course default** on Ancient and confirm it returns to the parent's current setting.
5. Assign Troy the same shared U.S. History edition through a different History parent. Set a different arrangement; AJ's settings do not change.
6. Go from topic-only to whole-course assignment and back; priority and arrangement preferences are not deleted. No other topics are implicitly assigned by choosing an arrangement.
7. Check legacy member `Both` values display as previous settings but cannot be newly selected. Group/All quick actions, Add Student, Cancel/Close and Done remain unchanged.
8. In Think Tank customize a combined course by removing one topic; verify the note is beside the title. In My Plan verify the same position, with student summary below *without* the customized count.
9. Test the portable desk at narrow widths: the note may wrap with its title but must not overlap controls or obscure student names.
10. Check permissions, fresh sign-in and separate-browser persistence. The demo service is private; anonymous users cannot load preferences.

Automated coverage: `tests/course-topic-provenance.test.mjs` checks course/topic arrangement inheritance, topic-specific Decide later, override deletion, changes to the course default, and distinct AJ/Troy parent contexts. GitHub builds also run the catalog tests, Next.js compilation and TypeScript checks.

Actual browser interactions still require a manual acceptance pass after merging.
