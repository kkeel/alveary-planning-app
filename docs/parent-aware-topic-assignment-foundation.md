# Parent-aware topic assignment foundation — 2027–28 Demo

## Behavior

Clicking **+** on a topic nested in a combined course no longer creates an
independent standalone Topic choice. It opens student checkboxes scoped to
the **saved parent course from which that topic was selected**. The existing
authorized `set_topic_student` action receives the parent course plan ID,
child topic plan ID and student ID. Its existing transactional server function
validates the topic-parent relationship, retains the exact source topic edition
and promotes the parent course from Think Tank to My Plan once a positive
assignment is saved.

No Supabase migration or new public browser access is required. The current
`plan_topic_student_overrides` and `plan_effective_student_topics` schema
already retain course, topic-edition and student provenance.

- The topic **+** opens a student editor without assigning anything.
- Checking AJ next to U.S. History within **History: Grade 9 (U.S.)**
  assigns only that topic to AJ through the Grade 9 parent.
- Checking Troy next to the same edition within **History: Grades 10–12
  (U.S.)** saves an independent choice under the Grade 10–12 parent.
- Think Tank keeps the active parent visible during editing; clicking **Done**
  closes the editor and allows the now-planned parent to appear in My Plan.
- My Plan displays **1 of 3 topics** (or the corresponding amount) for
  students who are not assigned all the included topics. Course-level
  student checkboxes continue to mean **whole included course** and include
  explanatory text for students assigned individual topics.
- Opening a planned topic's student editor still allows edits in all
  **planned parent course groupings** containing that topic edition. Edits
  target the selected parent, never every occurrence of the edition at once.
- The contextual editor retains **+ Add student** through the existing
  secured Demo Students service.
- Browser-only legacy Think Tank records must first be merged to the saved
  Demo plan. The contextual + action is disabled until that saved course
  and the connected topic are available; it never fabricates a standalone
  saved topic in place of an unavailable parent.
- Older independently saved Topic choices remain untouched. The correction
  affects **new** assignments from the nested combined-course + button.
- Priorities at individual topic level and the expanded Quick Add/Customize
  panel are intentionally **not** implemented in this foundation PR.

## Acceptance and regression checks

1. Bookmark Grade 9 (U.S.) History; click + on its U.S. History topic.
   Select AJ, then Done. My Plan must show **History: Grade 9 (U.S.)**
   with AJ assigned only **1 of 3** topics, not a standalone topic.
2. Repeat with Troy inside Grades 10–12 History. Verify the shared U.S.
   History edition shows AJ and Troy under **different parent courses**.
3. Promote AJ to the entire Grade 9 combined course using its group student
   checkbox. All included topics should then be assigned; Troy's other
   parent course remains unchanged.
4. Exclude and restore topics. Included-topic assignments should adjust
   without unexpectedly assigning excluded work.
5. Refresh and sign back in; assignments and source relationships persist.
6. Verify full-page Planning and portable Planning Desk, quick Done, student
   creation, live save feedback, and mobile interactions.
7. Recheck auth/entitlement rejection, no public member controls, and no
   changes to the live 2026–27 course picker.

`tests/course-topic-provenance.test.mjs` uses the published 2027–28
History parent editions and actual shared U.S. History edition. It runs
automatically with the prebuild catalog tests. UI/interactive browser
acceptance remains required before merging.
