# Course List + Planning Desk: full-width subjects and balanced responsive split

**Scope:** 2027–28 member Course List, shared mini Planning Desk (including
Books), and the slide-out drawer. The full Planning page, published
curriculum data, student assignments, Supabase, and live 2026–27 app are
unchanged.

## Layout decisions

The older CSS switched the side-by-side desk to a slide-out at the fixed
**1,280px viewport width**, even if the navigation was collapsed. The
Course Explorer also retained a two-column preview grid with an empty
second column, reducing the actual Course List width.

- Make the shell workspace a **named CSS inline-size query container**.
  This tracks the space available after the expandable/collapsible left
  navigation, rather than the browser viewport.
- Above approximately **810px of workspace width**, keep the desk at
  **370px** and give the Course List all remaining width. The list may
  shrink until it is approximately the same width as the desk.
- At **810px of workspace width and below**, hide the inline desk and
  use the existing floating launcher and slide-out drawer. The Course
  List then takes the full workspace.
- Keep the existing drawer width (up to 450px) and controls;
  no behavior or saved layout preference is added.
- In the mini desk, subject header/subject borders now extend across the
  available inner width instead of being doubly inset by the panel
  padding. The Think Tank's individual course cards retain a small
  4px inset so their light borders and separation remain visible.
  The desk header, intro, and controls retain readable breathing room.
- The browser body scroll lock follows the drawer's **actual CSS visible
  scrim**, including when the sidebar changes width without a viewport
  resize. We observe the workspace for those transitions.

At 810px workspace width, a 370px desk plus an 18px gap and ordinary
page padding leaves approximately 362–380px for the Course List,
depending on the shell's responsive inner padding.

## Browser acceptance

1. Start with the **collapsed left navigation** and a wide viewport.
   Course List and Planning Desk appear side by side. Narrow the window:
   the course list shrinks while the desk remains readable.
2. Continue narrowing until the two columns are **approximately equal**.
   Only then should the desk become the launcher/slide-out and the list
   reclaim its full available width.
3. At an intermediate viewport width, expand/collapse the **left
   navigation** without changing the browser width. The desk layout
   should respond immediately to the resulting available workspace.
4. Open the slide-out, then collapse the navigation / widen the
   viewport to restore the inline desk. The body must regain scrolling;
   no stuck overlay/scroll lock.
5. In the mini desk's **Think Tank**, verify the subject header and
   outer subject border use the panel's full content width. Two
   distinct course cards should still have a little breathing room,
   and each expanded course's topic controls must not overlap.
6. Repeat in **My Plan**, since it shares the subject container style.
   Check narrow viewports, long titles, wrapped metadata, and large
   desktop widths.
7. Visit **Books** (also uses the portable desk), the full Planning
   page, and signed-out Explore. Those should not acquire a duplicate
   preview grid or unintended extra columns.
8. Verify keyboard focus, subject and topic hover treatments, the
   one-open Think Tank accordion, and existing assignment editors.
9. Print Course List: the existing print CSS should continue hiding
   the desk, leaving a readable list.

Static regression test: tests/planning-desk-responsive-split.test.mjs.
A visual review of resizing and the navigation rail is still needed.
