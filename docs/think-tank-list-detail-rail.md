# Think Tank: list rows with a subject-colored details rail

Follow-up to course-card layout in PR #81 and unboxed subject stack in
PR #83. This changes the 2027–28 **Think Tank presentation only**.

## Visual contract

- **Subjects:** remain stacked without outer card borders, with their
  subject-tinted headers and short colored heading stripe.
- **Collapsed courses:** read as ordinary list rows. No outer border,
  radius, shadow, or filled card background. Use one quiet horizontal
  divider between adjacent courses, and retain their title metadata.
- **Expanded course title:** still looks like an unboxed list row. Title
  and info click targets remain neutral and independent of other toolbar
  controls.
- **Expanded course details:** a plain neutral/transparent background
  immediately beneath the title, slightly indented. A **4px left rail**
  runs for the height of the expanded details only (Description & tips,
  Topics, Other topics, editor), not up through the title.
- **Color:** the rail uses the exact same subject-dependent palette token
  as the subject heading stripe (`--pd-subject-edge`). Its variable
  must live on the subject **section**, not only the heading, so nested
  details inherit it correctly.
- **Spacing:** 4px horizontal list inset from the mini desk edge; quiet
  separation after the expanded details before the next course divider.
- **Responsive:** the mini desk, slide-out, and full Planning page share
  this treatment. Keep the 50/50 Course List/drawer transition from
  PR #82 intact.
- **Interaction:** one course detail open at a time *across all subjects*
  (PR #81), one topic disclosure open at a time within that course,
  and unchanged topic/student assignment behavior.
- **My Plan:** remains visually and functionally unchanged. It can use
  its own expanded styling; do not apply Think Tank's list selectors to it.

## Browser acceptance

1. Add multiple English courses plus a Literature course. Confirm
   collapsed courses are clean list rows with fine separators, no
   rounded rectangular card outlines.
2. Open Language Study Grade 7. A colored rail appears **only beside
   its details**, from the top of the details section to its bottom.
   It should be visible next to Topics, Other topics, and an opened
   assignment editor. The title row remains white/unboxed.
3. Open a Literature course. The English details close automatically
   and the left rail changes to the Literature subject color.
4. Hover course titles and info separately, then hover topic titles
   and toolbar icons. Neutral hover palette and independent hover
   surfaces must remain unchanged.
5. Repeat in the mini desk, narrow slide-out, and full Planning page.
   Verify long titles and metadata wrap, without text colliding with
   icons or hiding the details rail.
6. Check My Plan. The existing selection and assignment cards must
   be unchanged.
7. Check subject collapse/reopen, keyboard focus, and the
   Expanded/Compact control in full Planning.

Regression: `tests/think-tank-list-detail-rail.test.mjs`.
Existing `think-tank-single-open-course` and
`planning-desk-subject-stack` regression tests are updated from
course-card assumptions to the new list treatment.
