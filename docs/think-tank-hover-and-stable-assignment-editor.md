# Think Tank polish: highlighted hovers, management buttons, metadata, stable student editor

**Scope:** 2027–28 member Planning Desk. No database migrations,
API/schema changes, or changes to 2026–27 live member course picker.

## Confirmed design choices

**Keep lightbulb and checked-checkbox icons at topic level.**
They continue to communicate Think Tank vs My Plan; no changes were made
to the markers in `CourseTopicReview`.

### Hover highlights
Think Tank course title buttons, topic rows (including titles in
**Other topics** and excluded topics), the **Description & tips**
disclosure, subject disclosures, and the Other topics controls use the
same subtle neutral background highlight on hover/focus. Topic titles
must no longer underline on hover, regardless of whether the topic has
description text. The emphasis comes from the highlight, not a mixture
of underlines and unrelated backgrounds. Keyboard focus outlines remain.

### Actions
The topic `...` menu contains small outlined, padded, rounded buttons
with the same treatment as the course-level Remove action:

- **Remove idea** — removes this topic from Think Tank, not My Plan
- **Exclude topic** — customizes the course inclusion
- **Include topic** — restores inclusion to the course

Accessible labels preserve the topic title and parent-course context
even though the visible button copy is shorter. Existing assignment
logic is unchanged.

### Partial My Plan metadata
The old "Partly in My Plan" message moves to the course title's
secondary metadata line as **Partial My Plan**, with a middle dot between
it and a partial topic count. Example:

`2 of 3 topics · Partial My Plan`

If no partial topic count is necessary, the status appears alone. It no
longer shows as an extra stand-alone line in expanded details.

### Nested Description & tips
Opening a course by clicking its title or main ⓘ reveals the course
details, but **Description & tips is collapsed initially**. The member
opens it explicitly via the inner disclosure text. Clicking +/ +All also
never reopens a previously expanded description automatically.

### Keep the student editor stationary
Assignment checkboxes still save optimistically when selected: this
change **does not defer data persistence** and does not change the
meaning of Done or Cancel/Close.

The source topic is pinned to its **original displayed section**
(`Topics` or `Other topics`) while its editor is open. If a checkbox
causes it to become planned, the editor must remain reachable for
Advanced assignment, priorities, arrangements and further student
choices. Done or Cancel/Close releases that visual pin; only then does
the topic move to its saved destination.

The parent still stays open through the existing `justPlannedId` pin,
and a shared topic in a different parent course is untouched. This is
view-only state; no special backend write or artificial delay.

## Acceptance checks

1. Hover a Think Tank course title, a topic title with details, an
   excluded topic in Other topics, Description & tips, and Other topics.
   They should receive the same pale highlight instead of inconsistent
   underlines or no visible hover.
2. Open a topic `...` menu: **Remove idea**, **Exclude topic**, and
   **Include topic** (where applicable) appear as distinct tidy outlined
   buttons. The course-level Remove retains its design.
3. Confirm the lightbulb and checked-checkbox are **still visible**
   beside topic titles in Think Tank and My Plan.
4. With a partly planned course, verify a secondary metadata line like
   **2 of 3 topics · Partial My Plan** without the old detached Partly
   in My Plan text.
5. Open a course containing a description and combining tip. Inner
   Description & tips is initially closed; clicking that disclosure
   opens it. Close and reopen the course—it is closed again.
6. Open a nested Think Tank topic's + editor and select AJ. Before Done,
   open Advanced assignment and change priority/arrangement; the topic
   and editor must stay in the original list section.
7. Repeat from a topic under **Other topics**. Select a student and
   verify the topic stays in Other topics until Done or Cancel/Close.
   After exit, it can move to the actual saved state.
8. Repeat when the selected topic was the **last remaining** Think Tank
   idea in that combined course: the parent and student editor must
   remain visible throughout editing.
9. Check desktop portable desk and full Planning page, including long
   topics and shared U.S. History edition under Grades 9 vs 10–12;
   changes in one parent must not propagate to the other.

Automated regression in `tests/think-tank-editor-stability.test.mjs`,
run during prebuild. Browser verification remains necessary.


## Follow-up: scoped hover surfaces after PR #77

The first hover pass highlighted the **entire** nested `.pd-topic-row` on
hover or focus-within, so a hover over the toolbar accidentally colored the
title and its surrounding row. The updated shared Think Tank CSS removes
both row-level pseudo-classes and assigns independent hover/focus styles to:

- each clickable **topic title** (only when it has description/tips);
- each **topic toolbar icon** (info, books, bookmark, assignment, and more);
- the course-level **ⓘ** button, which stays neutral when open;
- the **subject header toggle**, which alone uses its subject's color.

The neutral Think Tank info hover uses the same Course List tokens:
`#f0f3ee` background, `#cbd6c9` border and `#4e6655` text.
Its expanded state remains neutral (`#f1f5ed`); hovering the expanded
button darkens it to `#e9eee7`. Subject toggles get a stronger wash of
their existing subject hue, not generic green. No curriculum/assignment
logic changed, and both the mini desk and full Planning page inherit the
same CSS.

### Additional visual checks

1. Hover the main course info ⓘ while closed, then click it, hover again,
   and close it. Compare with the unselected Course List View/Hide
   button: states should be neutral, not bright green/subject-colored.
2. Hover the Literature, History, and Geography subject headings. The
   highlight should follow **each heading's own** subject color, including
   on the text/chevron, instead of the same sage hover for all subjects.
3. In a selected topic, hover the title (when clickable), then hover
   info, books, + and ... independently: **only the hovered control**
   gains a pale neutral background, never the entire topic row.
4. Repeat in **Other topics**, including excluded entries and long,
   wrapping topic titles; verify neighboring controls do not highlight.
   A topic with no description/tips has a static title and should not
   falsely advertise a clickable title.
5. Tab across the title and icons to verify independent focus outlines
   and focus backgrounds. Recheck desktop mini desk, narrow-screen
   drawer, and full Planning page.
6. Confirm that expanding a description, adding students and opening
   More still work; topic selection lightbulbs/checkmarks stay visible.
