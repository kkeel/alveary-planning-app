# Shared course/topic priorities — first clickable iteration (2027–28 Demo)

## Intent
Priority is a planning thought, not an assignment or a scheduling action. Preserve the Course List's lightbulb (Think Tank) versus + / +All (student assignment). Save a priority whenever the thought arises, including before students are chosen. Defaults update only inheriting topics.

## Source of truth
- `plan_shared_priorities` stores optional defaults on an exact saved parent course, or on a linked topic edition within that parent.
- A null topic edition means course default. A concrete topic means explicit topic override. `Not set` on a topic means an intentional blank; absence means inherit.
- Student-specific priority rows in `plan_assignment_priorities` remain intact and take precedence. For a given student's topic: student topic > shared topic > student course > shared course.
- Parent heading priority is **derived** from the selected topics. All equal -> one priority, any differences (including unprioritized mixed with prioritized) -> Varied. A summary never writes to any default.
- A course priority change does not delete explicit topic overrides. Shared topic defaults are scoped to the saved parent; the same catalog topic used elsewhere is independent.

## UX
- Course List lightbulb acts immediately and offers a dismissible optional priority selector. Click outside / Escape / close dismisses without undoing the saved idea.
- + and +All continue opening the existing student editor, now with an optional shared priority selector before student choices.
- Think Tank and My Plan expose course-default editing when expanded and quiet selected-topic summaries on the course heading. Individual selected topics expose their own inherited-or-custom priority selector. No counts or completion pressure.
- Student-specific controls remain optional behind Advanced assignment.
- Intentional bulk "apply to all" is NOT implemented in this iteration: it will be evaluated after using normal course-default and explicit-topic behavior.
- Planning Companion home and tips are a separate next phase.

## Safe rollout
- Additive migration and the signed-in, verified-entitlement Edge API must be deployed together before merging client changes because the client validates the snapshot shape.
- No reset of workspace/member, assignment, or catalog records. Do not alter live 2026–27 data.
- The server RPC verifies a service-role call, Memberstack-linked auth identity, active family-owner workspace membership, the 2027–28 Demo plan, and that any topic belongs to and is included in the exact saved course context.

## Acceptance
1. History course lightbulb -> shared Core. Open topic US History and select Additional. Heading Varied, other selected History topics Core.
2. Change shared History course default to High Interest. US History stays Additional; other inheriting topics become High Interest.
3. Start with only Citizenship Ethics in Think Tank -> set High Interest. Citizenship summary High Interest while other topics remain unselected/blank, without a shared course default being silently written.
4. + / +All can assign students without any priority. When set, shared defaults apply to assigned students; student override wins.
5. Topic priority set in a combined course doesn't overwrite the same topic through another saved parent.
6. Lightbulb quick priority editor closes via outside click, Escape or X. No extra confirmation, no unintended removal.
7. Reload and verify persistence, responsive layout, existing hover/click targets, RLS/access restrictions, and build tests.

## Known design questions
- Whether a subtle optional "Apply to all selected topics" reset command is useful after member testing.
- Whether full By Priority view should group effective student-topic assignments versus showing shared course summaries.
- How Planning Companion should remember per-member guidance preferences and read/unread tips.
