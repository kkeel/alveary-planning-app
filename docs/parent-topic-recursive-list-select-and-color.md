# Reciprocal Think Tank and Plan List selections — parent vs topic origin

**2027–28 Demo only.** This supersedes the earlier one-way Course List
button behavior and the assumption that every unassigned included topic
was automatically a Think Tank idea.

## Precise member-facing rules

Selection strength shows WHERE the member acted, not just how many topics
happen to be included in the underlying curriculum catalog.

| Clicked control | Course toolbar | Clicked topic toolbar | Other included topics |
| --- | --- | --- | --- |
| Course lightbulb | **Saturated lightbulb** | **Light lightbulbs** | **Light lightbulbs** |
| One topic lightbulb | **Light lightbulb** | **Saturated lightbulb** | Neutral |
| Course +All and students assigned | **Saturated +All** | **Light + icons** | **Light + icons** |
| One topic + and students assigned | **Light +All** | **Saturated + icon** | Neutral |

Think Tank and Plan are **independent intentions** for an individual topic;
one can be planned while another topic in the same parent is being considered.
A planned topic's lightbulb is neutral. Nothing is inferred merely from being
an included topic of a saved combined course.

- A **saturated** bulb clicked again removes that direct Think Tank choice.
- A **light** parent bulb clicked once selects **all** topics, making the
  parent saturated and the children light; clicking the saturated parent
  again clears its Think Tank selection.
- A **light inherited** topic bulb clicked turns off only that topic's
  Think Tank membership. Clicking again can restore it as inherited.
- A **saturated** parent +All clicked again removes **all students** from
  that saved course (and the course returns to Think Tank with all its
  included topic bulbs light).
- A **saturated** topic + clicked again removes **all students** from that
  topic **within that exact saved parent**. Only that topic returns to
  Think Tank; assignments under other course parents stay intact.
- A **light** parent +All (some selected child topics) clicked opens the
  shared full-course student picker, allowing course-level selection; it
  is not treated as removal of individually chosen topics.
- A light inherited topic + clicked can remove that topic from its
  whole-course student assignments, leaving the other topics assigned.
- Already-chosen students continue to be edited in the portable or full
  Planning Desk, never through a separate List student-edit button.

## Persistence and safety

Adding a nested topic does **not** remove its siblings from the curriculum.
These are different fields:

- `plan_course_topics.included` — whether the topic is part of the course
  at all, for member customization.
- `plan_course_choices.idea_all` — whether the **parent course itself**
  was selected for Think Tank, implying all currently included topics.
- `plan_course_topics.idea_choice` — `inherit`, direct `on`, or
  deliberate `off` for a specific topic in its parent.

When + on a previously unsaved nested topic is clicked, the List calls a
new secured `prepare_plan` operation. It saves the correct parent and its
catalog child links with **no unrelated Think Tank ideas**. Only after the
links exist does the familiar student assignment editor open. +All still
creates course-level student assignments through that same editor.

The `demo_plan_list_action` RPC implements per-scope `toggle_idea`,
`clear_plan`, and `prepare_plan` atomically in the exact verified
workspace and saved parent. JWT, current Memberstack entitlement, role,
student membership, and service-role-only Postgres permissions remain as
before; no browser direct SQL grants or public Explore write controls.

The existing student editor's negative assignment actions also preserve
Think Tank intentions: unassigning the final student from a topic returns
that topic as an idea, while whole-course student removal returns included
topics to the course's Think Tank context. Saved per-student priorities and
arrangements remain untouched. **Shared source editions in other parent
courses are never modified.**

Previously saved whole-course Think Tank ideas retain `idea_all=true`,
with each topic inheriting them. Older **planned choices with only explicit
positive topic assignments and no whole-course student links** are inferred
as topic-origin selections instead, so unrelated siblings do not falsely
light up. This is a one-time Demo-only compatibility adjustment to the new
intent field; it does not change assignments, priority, arrangement, or
included-topic customizations. Where the prior UI never stored the original
click location, member re-selection can still clarify ambiguous historical
choices. Courses intentionally returned to Think Tank with their previous
student checkboxes retained remain visible as drafts until promoted again.

## Acceptance testing after merge

1. Choose Literature Grades 7–8 **lightbulb at course level**. The course
   bulb is saturated coral and both child bulbs light coral. Click the
   course bulb again; the bulbs return to neutral.
2. Click **only** General Lit's lightbulb. General Lit is saturated,
   its parent light, Lit./Mythology completely neutral. The mini desk's
   Think Tank shows General Lit only under its Literature parent.
   Click General Lit's bulb again; it is removed from Think Tank without
   deleting unrelated course customizations.
3. In a fresh History Grade 9 course choose nested U.S. History **+**,
   select AJ, Done. U.S. History's + is saturated purple, the parent +All
   light purple, World/Ancient **both bulbs and pluses neutral**. My Plan
   shows only U.S. History through its Grade 9 parent.
4. Click U.S. History's saturated + again. Its students are cleared,
   it leaves My Plan and returns to Think Tank as an individual topic
   selection. Refresh and verify both view and status.
5. Start a different combined History parent through **+All**, assign Troy.
   Parent +All saturated; every included topic + light. Click an inherited
   topic + again; that topic is unassigned, its other parent/topics remain
   untouched.
6. Click the course's saturated +All to remove all its assigned students;
   the **whole course** returns to Think Tank with saturated parent bulb
   and light bulbs for all included topics.
7. With one topic deliberately in Think Tank and a different topic in
   My Plan, confirm each column displays **only** selected topics,
   neither duplicated nor filled with untouched siblings.
8. Independently assign the same U.S. History edition through Grade 9
   and Grades 10–12. Toggling a lightbulb or + in one parent cannot
   affect another parent's assignments or topic intentions.
9. Review mobile icon hit targets, course/child color contrast,
   View/Hide behavior, localized grade filters and refreshed sessions.
10. Test that public Explore shows no selection controls and that
    2026–27's existing course picker is unchanged.

Automated origin and cross-parent tests run in
`tests/course-list-subject-state.test.mjs`. A logged-in browser
acceptance pass is still necessary.
