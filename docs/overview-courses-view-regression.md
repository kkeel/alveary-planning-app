# Overview → Courses must preserve the member's view choice

## Regression addressed

The Planning Overview's **Choose courses** link explicitly called
`setCourseMode(signedIn ? "plan" : "browse")` before navigating to Courses.
This forced eligible members into **Planning** on every click, even when the
browser's saved List selection had been restored correctly. It was particularly
noticeable after returning from Webflow, because the dashboard lands at the
Planning Overview first.

The Overview now navigates to `/courses` without changing `courseMode`.

## Expected behavior

- Brand-new eligible member with no prior Course view preference: **List** is
  the default, with the portable Planning Desk.
- Member who last explicitly selected **List**: choosing Courses from the
  Overview leaves the member in List.
- Member who last explicitly selected **Planning**: choosing Courses from the
  Overview respects that remembered choice, including after a return from
  Webflow using the same browser.
- The List | Planning toggle and mini desk expand action remain the only
  explicit controls that change the view.
- Direct links to Courses, sidebar navigation, and return from Books continue
  to work. Existing course choices, filters, students, assignments, and
  browser notes are unchanged.
- Public visitors still see Explore without member planning controls.

## Check after deployment

In the same browser, use the toggle to choose List, return to the Webflow
dashboard, reopen the app, and click Choose courses. Confirm List opens.
Repeat with Planning selected to verify the member's last choice is preserved.
Also check a fresh browser starts in List. Build and typecheck before merging.
