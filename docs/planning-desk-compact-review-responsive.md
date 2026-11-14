# Planning Desk readability and navigation refinement — November 14, 2026

This is a visual and navigation follow-up to `shared-planning-desk-first-pass.md`. It modifies only the 2027–28 preview; no curriculum data, family records or membership entitlements are modified.

## Review and clarity

- The shared Planning Desk is now **sticky below the top bar**, with the heading and Think Tank / My Plan tabs always visible while its **body scrolls independently**. Previously the header scrolled out with longer subject stacks.
- The desk's default width increases from about 310 px to a maximum of **370 px** when screen space allows. The course list and toolbar keep a readable width.
- Subject-level **reorder/reset** and item-level **up/down/remove** actions move into a **single unobtrusive ellipsis menu** per row. Collapsing a subject remains one click on its title/chevron; actions remain accessible by keyboard.
- Saved items no longer display the technical `Combined Course`, `Course`, or `Topic` classification labels. A combined course is recognizable by its nested topic list; otherwise each item reads naturally as a saved curriculum idea.
- A combined course's connected topics now appear directly in its **inline Planning Desk review**, ordered using the same contextual source-plan logic as the Course List. Their titles can be expanded independently to read descriptions and placement guidance. Items without an available description show only available information—no apology or `No description` placeholder.
- Placement/combining guidance uses the same **shared two-overlapping-circles icon** as the Course List, with a subtle **sage** tone instead of the former blue-gray box.
- The book link is shortened to **View Books**, with its icon at left; the Book List is still a scaffold, and this is not yet a per-course resource deep link.

## Persistence and navigation

- Course List **List vs Planning mode** is now part of the shared Planning Desk state rather than resetting on route remount. Existing browser-preview Think Tank records are retained and older saved records without `courseMode` migrate into Planning mode.
- Opening the Book List via the Planning Desk, browsing Books, then returning to Courses through the **sidebar** should keep the last Course List mode, including the desk when the previous mode was Planning.
- Both the Book List page and the desk offer an explicit **Back to Course List · Planning** link.
- The separate **Compare** UI is removed as requested. Fuller comparison of saved curriculum and later books will be designed within the shared desk (not implemented in this PR).

## Small-screen behavior

- At **1280 px viewport width and below**, the desk is not pushed to the bottom of the page. Instead a **fixed small summary** remains visible near the bottom-right, showing Think Tank ideas and My Plan selections.
- Choosing either summary opens the shared desk as a **right-hand slide-out drawer**, with a scrim, close control, Escape-to-close and independently scrollable content.
- On wider screens, the desk remains visible, sticky and open by default unless the member selected Quiet Mode. These are layout changes; they do not copy or split saved-state records.

## Deliberate boundaries

My Plan has no real student assignments yet; its displayed count remains 0 and its panel is an honest placeholder. Think Tank preview ideas are browser-local until household/student Supabase RLS and authorization are implemented. New book resources and Amazon affiliate links are not introduced here. The public List view remains without the Planning Desk.

## Manual review checkpoints

1. With 30+ Think Tank ideas, scroll down the Course List and verify the desk **title/tabs stay visible** and only its saved-subject list scrolls.
2. Open a course with multiple topics (Citizenship Grade 7 is a useful example), inspect nested topic descriptions, click View Books and return through both the page's **Back** link and the sidebar. Planning mode must be preserved.
3. Verify saved items **never show course/type classification headings**; no absent-description disclaimer remains.
4. Check the combining icon and sage box, plus ellipsis actions for up/down/remove and subject reset. Selected rows keep their ordering; no visible wall of icons.
5. At <=1280 px, confirm a **floating Think Tank/My Plan summary** is visible while scrolling. It should open a drawer and close by X, scrim or Escape without pushing the desk below the Course List.
6. List mode remains uncluttered and there is no Compare button.
