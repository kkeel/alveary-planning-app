# Shared Planning Desk — first preview implementation (2026-11-13)

## Design status

First-pass **visual and local-state preview**, not a completed family-planning or student-assignment system. The Course List Browse and Compare modes remain. Planning mode shows an open-by-default Planning Desk on the right. Choosing Quiet Mode leaves a clickable summary:

- **Think Tank · N ideas** (canonical course or topic bookmarks)
- **My Plan · 0 selections** (placeholder; no student assignments yet)

The desk is mounted **once in `AppShell`** through `PlanningDeskProvider`, rather than reproduced inside CourseExplorer. It is visible in Course List Planning mode and on the Book List route. Book List remains the unbuilt public-safe placeholder page. Later Books, Supplies and Scheduling may opt into the same desk using the shared shell, without copying state/UI.

## First-pass behavior

- **One-click Save to Think Tank** on course rows and nested individual topic rows in Planning mode.
- Repeated appearances of a canonical curriculum item have a shared **saved** indicator, while each occurrence's `View Details` expansion remains independent.
- Existing saved preview bookmarks/notes are migrated locally (only if the new store doesn't already exist) from `alveary:course-explorer-preview:2027-28` to `alveary:shared-planning-desk-preview:2027-28`.
- **Think Tank** groups by subject in the existing publication sort (subject sort, course App Presentation Sort, topic Plan Sort). Subjects and saved items have accessible Up/Down controls to reorder. Subject lists can be collapsed and reopened. Their order and collapse preferences are retained.
- **New saved entries** are inserted near their closest curriculum-order neighbors while earlier manual arrangements stay in place. Subject and item order may each be restored independently.
- Think Tank entries open a **compact inline review** with available course rationale and placement guidance, plus a labeled preview link to Books. No unrelated duplicate slide-out.
- **Quiet Mode** saves the display preference and shows both Think Tank and My Plan counts. Either summary reopens that tab.
- The Think Tank persists in **browser-local storage only** and does not contain authenticated household data. The My Plan tab clearly states that student assignments and shared data have not yet been built.
- No actual book preparation records, household records, student records or Amazon links have been created.
- List and Compare pages continue using the previous implementation, and there is no new public access to protected curriculum.

## Architecture and future work

The common `PlanningDeskContext` supplies browser-preview state and actions. `AppShell` determines page placement, while `PlanningDesk` owns the visual panel. The next iteration should add a secure, RLS-protected family/student/assignment store in Supabase, replace local preview storage, and show proper assigned counts without conflating saved ideas with actual student assignments.

Before launch: design and verify Memberstack entitlement checks and public-vs-member planning access; currently these are **prototype** controls, not membership enforcement. Keep affiliate links on permitted public Book detail views while deciding Amazon Associates compliance. The Book List will build on the same desk rather than creating another copy.

## Suggested manual review

1. Start on Courses in **List** mode—there should be **no Planning Desk**. Switch to **Planning**; desk opens at right, empty for new users.
2. Bookmark a combined course, open its details and bookmark an individual topic. Confirm two separate Think Tank ideas and synchronized saved icons on any repeated appearances.
3. Collapse a subject; reorder subjects and individual ideas with arrow buttons. Save another relevant idea; previously moved items stay in place.
4. Choose **Quiet Mode** and confirm both counts remain accessible; reopen Think Tank and My Plan using those summaries.
5. Click Books from the sidebar; the **same Think Tank** appears. Return to Courses and confirm notes, saved ideas, preferred quiet mode, collapsed subjects and custom ordering persisted.
6. Compare view, grade/country filters and independent course disclosures still work as before.
7. Confirm that **My Plan** is labeled as an unavailable assignment feature and never invents saved student selections.

## November 14, 2026 — Customize combined-course topics

- A saved course still appears as one subject-level Think Tank idea; all connected edition topics are included by default. Each child topic has an independent **Remove / Restore** control within that course's inline review.
- Topic exclusions are saved in the existing browser-preview storage as a **parent plan ID → excluded child topic plan IDs** map. The original course and edition references remain untouched, and no new official course, student assignment, schedule, or PDF is created.
- An excluded topic appears crossed out in the parent course review. The parent idea shows a customized count and **Restore all** action. A course can temporarily have zero included topics without being deleted.
- A topic explicitly bookmarked on its own remains separately saved even when removed within a parent course. Exclusions for one course have no effect on a second course linking the same canonical topic. Removing the parent course resets only its own exclusions, so re-saving it starts with all connected topics.
- Combined-course PDFs and individual-topic PDFs remain fixed published documents. These draft planning choices must not be interpreted as custom PDF generation.
- Future Supabase student-plan work should convert these explicit exclusions into student/course-context selections and preserve the exact edition relationships, rather than treating a course heading alone as one indivisible lesson assignment.

### Manual checks

1. Save a combined course with several topics; verify all appear included. Remove one, check the parent counter and line-through, then restore it.
2. Remove two topics, navigate to Books and back, refresh, and verify the choices remain. Restore all; remove the entire parent and re-save it to confirm it starts complete.
3. Independently bookmark one of the topics, then exclude it from a combined course. The independent bookmark must remain. For a topic shared by two parents, excluding it in one parent must not alter the other.
4. Check single-topic courses, combined courses with only one linked topic, mobile drawer controls, previously saved Think Tank items, and public List mode.
