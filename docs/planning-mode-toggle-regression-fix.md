# Planning mode toggle regression fix (2027–28 development)

## Root cause

The app shell initializes the member Course List view to **List** in an auth-status effect. The effect depended on the `setCourseMode` callback from the Planning Desk context. That callback was created inline in a memo that recomputes whenever the entire desk state changes. Clicking **Planning** changes that state, recreates the callback, and unintentionally reruns the shell initialization, snapping the view straight back to **List**.

## Fix

- Define `setCourseMode` once using `useCallback` and a functional state updater. Its identity remains stable across course mode, filter, Think Tank, and other planning-state changes.
- Keep the shell initialization tied to the authenticated status instead of view state. Members still enter List initially; manual List | Planning choices now persist while navigating within the session.
- Do not alter authorization, user preferences, assignments, catalog records, or Supabase persistence.

## Acceptance

1. Sign in to the 2027–28 development app; /courses starts on **List**, with portable Planning Desk.
2. Click **Planning**. The full-page Think Tank and My Plan columns remain visible. Click **List** and confirm the curriculum and portable desk return.
3. Repeat switching rapidly. Opening/closing topics, Think Tank entries and student editors must not snap the mode back.
4. Navigate to Books and back during a signed-in session; neither navigation nor plan synchronization should erase saved assignments.
5. Public /courses continues to expose Explore without the member toggle or desk.
6. Run Next.js build/TypeScript/static checks; browser-test the toggle before merging.
