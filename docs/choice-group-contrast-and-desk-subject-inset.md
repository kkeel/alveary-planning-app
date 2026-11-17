# Think Tank slight subject inset and Course List choice group contrast

This is presentation polish for the **2027–28** planning app. No changes
to students, assignments, curriculum data, Supabase, or the live app.

## Think Tank / Planning Desk subject spacing

- Keep the unboxed, vertically stacked subjects from PR #83.
- Keep plain Think Tank list rows and the subject-colored details-only
  left rail from PR #84.
- Add just **6px of horizontal padding** on each side of the mini
  Planning Desk's subject list, including My Plan. This subtly separates
  the tinted header stripes from the outer desk frame without bringing
  back subject borders or full course cards.
- The full Planning page already has column padding and is not changed.
- Keep the existing 50/50 responsive Course List-to-drawer transition.

## Course List: choice groups

Choice groups currently blend with colored course selections because their
accent borders and header use green. We want a visual treatment reserved
for a *decision between courses*, rather than another curriculum subject:

- Replace the green group border with **Alveary charcoal** (#434a45).
- Give the group header a dark charcoal fill (#303631) and **white
  title text**, with pale gray guidance when present. The individual
  course choices stay on white or existing subject-selection tints.
- Put a small neutral **Choice 1**, **Choice 2**, etc. label immediately
  after each option's course title, not beside the action toolbar or
  in the topic rows.
- Use the **published visible display order** (presentationSort, sort,
  and ID), not the raw group courseIds array, to number options.
  Compute numbering from the complete available group *before*
  filtering by search. A search result containing only Choice 2 must
  still read **Choice 2**; it cannot be silently renumbered.
- Keep existing student assignment, Think Tank/bookmark, expansion,
  hover, and topic-selection behavior intact.
- Print headers use a pale background and dark text for legibility.

## Browser checks

1. In mini desk Think Tank, verify English/Literature subject headers
   have a slender 6px inset from the desk edge, with no subject box.
   Their course titles remain list rows, and open details retain their
   subject-colored rail.
2. Check My Plan in the mini desk as well. Verify the rail and assignment
   controls have not been altered. Confirm drawer and 50/50 split.
3. In Course List, select grade 7 and look at **Latin Choices: Level 1**.
   The group outline/header should be charcoal with white title,
   visibly distinct from nearby colored curriculum selections.
4. Expand both Latin options. Labels should sit beside their titles
   in the full list, and child topic rows must not display a badge.
   For this group the published display order is Independent Study
   then Video Course, so those should be Choice 1 and Choice 2.
5. Search **Video Course**. The lone visible Latin option should still
   display **Choice 2**, not Choice 1. Clear the search and verify both.
6. Check Science Choices: Grades 9 and 10, narrow Course List, collapsed
   sidebar, drawer breakpoint, and print preview. Long course names
   should wrap without overlapping the new badge or action icons.
7. Confirm Course List and full Planning page do not inherit new
   Planning Desk subject borders, color fills, or other changes.

Automated checks: `tests/course-choice-group-contrast.test.mjs` plus
the updated `tests/planning-desk-responsive-split.test.mjs`.
Browser visual verification still required before merging.
