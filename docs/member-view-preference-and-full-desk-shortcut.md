# Remember the member Course view and expand to full Planning

Applies only to the **2027–28 Alveary Planning App**. No Supabase schema, member assignments, or live 2026–27 planner changes.

## Intent

- New signed-in members enter **List**, showing the curriculum and portable Planning Desk.
- The member's last explicit **List | Planning** choice is restored on reload/revisit **in the same browser** using the existing account-scoped local planning preferences. Choosing List must also persist.
- Loading an old saved Think Tank with no stored view choice does **not** count as having chosen Planning.
- Public visitors always use Explore (no private Planning controls).
- The mini desk's existing expand/maximize icon now switches directly to the **same full-page Planning** view as the toggle. It no longer launches the separate wide floating overlay.
- When the portable desk is displayed on Books, its expand icon changes to Planning and navigates to Courses, so the action isn't stranded on the wrong page.
- The mini desk's quiet/collapse and small-screen drawer are unchanged.

## Root cause and fix

The app shell previously called `setCourseMode("browse")` whenever auth resolved, overriding the browser-stored Planning selection. The shared context already hydrates and persists `courseMode`, so the shell now waits for that hydration and signed-in status without forcing a view. The hydration fallback changes to **browse**, unless `saved.courseMode` is explicitly **plan**.

## Acceptance checks

1. In a fresh test browser with no saved planning view, sign in and open Courses: **List** is selected and the portable desk is visible.
2. Choose **Planning**, refresh the tab and return to Courses later in the same browser: full Think Tank and My Plan remain visible, with the Planning toggle selected.
3. Choose **List**, refresh: curriculum and portable desk return, List remains selected.
4. In List, click the mini desk's top-right expand icon: go directly to full Planning without a temporary wide overlay.
5. From Books, click the mini desk expand icon: navigate to Courses in Planning.
6. Public Explore has no member toggle or desk.
7. Existing account-scoped grade/country filters, saved course choices, students, topic assignments, and browser notes are unchanged.
8. Build/typecheck and check responsive behavior before merging.
