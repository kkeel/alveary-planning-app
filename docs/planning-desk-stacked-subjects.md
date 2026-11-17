# Planning Desk: stacked subjects without outer boxes

Applies to the 2027–28 mini Planning Desk (Think Tank and My Plan) and
the full Planning page. This is a presentation-only refinement following
the balanced responsive layout and separate Think Tank course cards.

## Visual intent

The **Planning Desk itself** is the outer container. Subjects should feel
like a continuous stack beneath the desk tabs and introduction, rather
than nested white cards within another enclosing panel.

- Remove the outer subject box border and white card background.
- Preserve the soft, subject-tinted header and its colored left stripe.
- Stack subject sections with a small **4px gap** rather than framed
  boxes separated by a second surrounding outline.
- Keep each Think Tank **course** as a distinct bordered card, so a
  course's expanded details are still clearly enclosed.
- Give course lists only **4px horizontal inset** inside the mini desk's
  full-width subject area. Think Tank cards retain a modest 8px top and
  7px bottom cushion around the subject's records.
- Apply matching unboxed subjects to My Plan and the full Planning page
  without changing its separate course/assignment interactions.

## Manual acceptance

1. Add three English courses and one Literature course to Think Tank.
   The subject headers should span the available desk width, with no
   thin outer box left/right/bottom lines framing each subject.
2. Confirm the subject sections sit directly beneath the introduction
   and stack beneath one another without looking like nested containers.
3. The individual course cards should still show separate neutral
   outlines and their title/details divider when expanded.
4. There should be just a tiny horizontal gap between a course-card
   border and the Planning Desk edge, without clipping or overlapping.
5. Repeat in My Plan, the full Planning page, the mini desk drawer,
   and at the approximately 50/50 Course List / desk split.
6. Verify subject hover colors, course and topic hover targets,
   single-open accordion, and student assignment editors remain intact.

Static guard: tests/planning-desk-subject-stack.test.mjs.
