# Finalize partial combined course when Done is clicked

## Reported issue

A member checked AJ for **U.S. History: Grades 9–12** inside
**History: Grade 9 (U.S.)**, but the right-hand My Plan didn't acquire the
Grade 9 History record after Done. The U.S. History child remained visible
under its parent in Think Tank.

Investigation confirmed the 2027–28 database contained a Grade 9 History
choice with `stage = idea` AND a positive topic-student assignment.
This state can occur after **Return to Think Tank**: that action demotes the
course stage but intentionally preserves students and their topic overrides.
Opening the editor then shows the previous checkbox checked, so it doesn't
trigger an assignment `onChange` or automatically promote the parent.

The old Done control only closed the editor, leaving the stage mismatched.

## Corrected transition

- The shared student editor now checks, on Done, whether it is editing an
  `idea` that already has an **effective assigned student** in its current
  scope (whole-course student link or selected child topic). If so it calls
  the existing authorized `set_stage(parentId, planned)` before closing.
- It works even when the member doesn't need to toggle an already-checked
  student. No duplicate assignment records, new tables, or state migration.
- It never treats an individually assigned topic as a whole-course student
  assignment and never promotes a course with no selected students.
- The optimistic stage update enters the existing serialized Supabase Demo
  mutation queue. Done remains responsive and doesn't wait for the network;
  save errors still use the existing rollback and feedback.
- The existing parent topic split is preserved: if only U.S. History is
  assigned to AJ, My Plan contains **History: Grade 9 (U.S.) — AJ · 1 of 3
  topics**, and Think Tank displays that same parent with **World and Ancient
  History**. It is one saved parent choice displayed through two lenses.
- Separate focus state makes the My Plan row expand when a topic is added
  or Done finalizes a previous selection; the completed topic is not kept
  artificially pinned in Think Tank after Done.
- Quick Add, priority inheritance, and saved topic priorities remain
  separate follow-up work.

## Browser QA

1. **Reproduction state:** Open a combined course whose U.S. History child
   has AJ checked but remains an `idea`. Click Done **without toggling AJ**.
   The parent now appears and expands in My Plan. U.S. History disappears
   from Think Tank, while World and Ancient History remain.
2. **New assignment:** From a fresh parent idea, check AJ for U.S. History;
   the right column should reflect the optimistic assignment and expand the
   parent. Done must close the editor without undoing that move.
3. Refresh/sign back in: parent stage, topic assignment and student are
   consistent with the saved plan.
4. **No assignment:** Open any topic editor and click Done with everyone
   unchecked. The parent remains only in Think Tank.
5. **Whole course:** + All with already-selected whole-course students can
   finalize a previously returned-to-Think-Tank choice. The combined
   parent remains just in My Plan if every included topic is assigned.
6. Repeated additions to the same course, fast clicks, shared AJ/Troy U.S.
   History editions under different parent courses, user switching, and
   portable/full Planning views remain consistent.
7. No Supabase migrations, public Explore access changes, or 2026–27
   application changes.

Pure regression assertions using the actual Grade 9 History catalog entry
and saved `idea` stage with prechecked U.S. History are in
`tests/course-topic-provenance.test.mjs` and run as part of the PR build.
Interactive browser QA remains necessary.
