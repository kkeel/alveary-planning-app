# Expanded / Compact views and explicit Course List planning paths

Scope: 2027–28 development app only. No Supabase migration or member-data rewrite.

## Defaults and persistence

The member Course List and public Explore share the SAME curriculum data and row content.
They now default to **Expanded** for browsing (descriptions, recommendations,
schedules and included child topics visible without repeatedly clicking titles).

An accessible **Expanded / Compact** choice near the List/Explore filters switches
every row to the relevant baseline. Individual titles may still open/close their
details independently. Switching the global view resets per-row disclosure
overrides rather than erasing filters or selected ideas.

The full Planning Desk provides **independent** view controls in its two columns:

- **Think Tank:** Compact by default, optional Expanded.
- **My Plan:** Compact by default, optional Expanded.

Planning preserves its existing grouped subjects, topic customization, student
editors, saved priorities, arrangements and other member controls. Each
column can expand its saved course reviews without changing the other column.

All three view preferences are stored alongside the existing signed-in,
browser-scoped Planning Desk preferences; returning to Course List or
Planning restores the member's last selection. Public Explore starts Expanded
per session and never displays private planning actions or writes member data.

## The two actions in member List

Every top-level course and choice option has explicit alternatives:

- **Think Tank (lightbulb)** saves the course as an unassigned idea, without
  choosing students or promoting it into My Plan.
- **+ Plan / + Plan all** opens the SAME inline student editor used throughout
  Planning. Single-topic courses use Plan; combined parents use Plan all.
  Members can choose All, a group or individual students, then optionally
  customize per-student course/topic priorities and arrangements before Done.
- A topic nested within a combined course uses **Plan** to assign only that
  topic through its original saved parent. Other topics stay unassigned and
  available in Think Tank. The action never saves an orphaned standalone topic.
- The action changes to **Students** for a course or topic with an effective
  assignment so the same editor can be reopened for adjustments.
- Saving/assigning a nested topic always creates or reuses the **parent
  course** first. The student editor waits until the confirmed saved
  parent/topic relationship exists rather than showing a broken form.
- A saved/partly planned parent remains one course record viewed through
  both planning columns. List retains the portable Planning Desk alongside
  browsing; the List|Planning toggle still opens the full desk.

Safety: The nested Think Tank indicator cannot be used to remove a parent
that is already saved; a planned parent's Think Tank control is likewise
non-destructive. A saved but unplanned top-level course can be removed by
its explicit Think Tank toggle. The normal Planning Desk removal controls
remain available.

## Browser acceptance

1. Open public Explore while signed out; it starts **Expanded** and
   shows descriptions, grade and schedule details and nested topic
   descriptions. Switch to Compact; titles remain clickable. No lightbulb
   or student assignments appear.
2. Sign in and open Courses in **List**. It starts Expanded for a fresh
   account; switch to Compact, navigate to Planning then back to List,
   and confirm the List preference persists.
3. On a clean course choose **Think Tank** only; it appears in the
   portable desk and in full Think Tank, with no students assigned or
   My Plan record.
4. From a different single-topic course choose **+ Plan**; the
   familiar students editor appears inline and supports Add student,
   All/group shortcuts, Advanced assignment and Done.
5. On **History: Grade 9 (U.S.)**, click Plan all and assign AJ; all
   included topics become part of AJ's plan. Check the course summary
   and refresh.
6. On a fresh **History: Grades 10–12 (U.S.)**, open its nested
   **U.S. History** and click Plan. Assign Troy; verify only that
   topic moves to My Plan under Grades 10–12, not a standalone topic
   or another History parent.
7. If both parents contain the same U.S. History edition, edit through
   the existing course-context switcher and verify AJ/Troy and priorities
   remain independent. On a previously excluded topic, show restore
   guidance instead of creating a new orphaned choice.
8. In full Planning switch Think Tank to Expanded while My Plan remains
   Compact, then reverse them. Individual courses still disclose details.
   Both columns start Compact for a fresh member.
9. Check the small-screen Course List and portable desk. Both List
   buttons remain accessible without overlapping the course title, and
   expanded rows don't cover the assignment editor. Print List excludes
   its interactive add/edit controls.
10. Verify persistence and authorization after refresh: public visitors
    cannot see private student editors; current member assignments remain
    saved in the existing secured 2027–28 Demo APIs.

Automated routing assertions are in
`tests/course-list-actions.test.mjs` and run during the standard build.
Manual browser interaction remains necessary before deployment sign-off.
