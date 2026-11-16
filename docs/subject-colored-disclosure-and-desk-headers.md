# Subject-aware disclosure and Planning Desk header tint

This is a **visual-only polish** for the 2027–28 Alveary Planning app.
It reuses the exact subject palette from
`app/courses/legacy-subject-colors.mjs`. No saved planning data,
course inclusion, priority, assignment, or database schema is changed.

## Course List: active View / Hide

- A closed **View ⓘ** button remains neutral.
- When member List details are open, **Hide ⓘ** uses the row's subject
  palette: the same pale wash used for status, a slightly stronger subject
  outline, and darkened subject-tinted text/icon for legibility.
- In signed-out public Explore, the existing neutral disclosure remains.
- The `aria-expanded` state, text labels, title click behavior and
  keyboard focus ring stay unchanged. Opening details must never be
  interpreted as adding to Think Tank or My Plan.
- The treatment works for direct selections, inherited topics, partially
  planned parents, and unselected rows, regardless of current subject.

## Think Tank and My Plan: subject-level wayfinding

The **subject header strip only** uses:

- a very pale `subjectColor(subject) + "15"` wash (matching the
  Course List's existing selected title tint);
- a restrained inset left edge `subjectColor(subject) + "66"`.

The shared `.pd-subject-heading` style is used by Think Tank and
My Plan in both the List's portable desk and the full two-column Planning
page. The course/topic cards beneath remain neutral; the heading text and
controls retain their original accessible dark text.

## Manual checks after merging

1. In member List, expand a planned Geography course. **Hide ⓘ** should
   look harmonized with the blue Geography highlight rather than displaying
   a separate sage/green tile. Close and reopen through both the title and
   ⓘ button; ensure the control returns to the neutral View state.
2. Repeat with Literature (coral), History (purple), and a muted/light
   palette subject such as Life Skills (yellow): the Hide label/icon must
   remain legible.
3. Verify the same behavior on a directly planned topic, an inherited
   topic and a partially planned combined course.
4. Open the **mini Planning Desk**. The Think Tank and My Plan subject
   headings should be gently tinted by subject, without changing the
   course and topic rows below.
5. Open **full Planning** and compare the two columns. Their subject
   headers should use the same palette and intensity, at compact and
   expanded row densities.
6. Confirm public Explore's information controls remain neutral,
   and that focus-visible and mobile tap targets still work.

Build/TypeScript and existing subject palette/provenance tests are required
before merge; visual browser verification is still needed.
