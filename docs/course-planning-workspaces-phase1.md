# Course planning workspaces — phase 1 (2027–28)

## Behavior

- Anonymous /courses displays Explore Courses with filters, without member toggle, bookmarks, or private desk.
- Members open List by default; it keeps the same curriculum browser and Think Tank bookmark actions alongside the portable Planning Desk, including its mobile drawer.
- The existing List | Planning toggle opens a full-page Planning Desk in Planning. Think Tank and My Plan are simultaneously visible side by side on desktop, stacked on narrow screens.
- Both desk variants reuse the SAME Think Tank content and My Plan component, backed by the same authorized saved choices, notes, topic review and student assignment operations.
- NotebookPen identifies the desk in the header, quiet state, mobile launcher and full view. Lightbulb identifies Think Tank and its idea rows. The original toggle icons remain.
- Books retains a portable desk; Back to Course List returns to member List.

## Explicitly out of scope

- Quick Add/Customize assignment UI and separate lightbulb/plus catalog actions.
- Partial-course assignment backend, shared-topic routing, student-first organization and topic-level priorities.
- Any Supabase mutation, 2026–27 live app change, curriculum data migration or auth modification.

## Browser acceptance

1. Public /courses has Explore heading, filters and no List/Planning toggle or bookmark.
2. Signed-in member /courses defaults to List with bookmarks and portable desk.
3. Click Planning: curriculum list and portable side desk disappear, two-column Think Tank/My Plan appears. Click List and the portable desk returns.
4. Save an idea from List, then view and promote it from Planning; confirm My Plan updates on the same screen and survives a reload.
5. Check subject reordering, topic details, student assignment, browser-only Demo merge, notes and return-to-Think-Tank work in the full view.
6. Empty My Plan in side-by-side mode does not show an unnecessary Open Think Tank tab button.
7. Books still displays its portable desk. At narrow widths, List keeps the drawer and Planning stacks both columns without a floating launcher.
8. Run catalog checks, TypeScript check, build and browser review before merge.
