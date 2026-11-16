# Instant planning feedback, global save status, and matching hover states

For the **2027–28 development Planning App**. This is a UI and existing
client-state improvement only: no Supabase migration, Edge Function change,
or changes to the live 2026–27 planner.

## Immediate Think Tank confirmation

The Course List already has the published course/topic catalog available.
New Think Tank choices now create an **optimistic saved parent preview with
its actual included topic links**, instead of a blank `topics: []` record
that left the List unable to color the selected button until the server
responded.

- A first click on a course's lightbulb immediately colors the course bulb
  saturated and its inherited topic bulbs lightly.
- A first click on an individual topic's bulb colors only that topic
  saturated and its parent lightly; unrelated siblings remain neutral.
- Repeated clicks reverse the selection immediately, while the existing
  serialized server queue processes saves in order.
- The mini and full Planning Desk derive Think Tank choices from the **live
  optimistic plan snapshot** plus any older unsynced browser-only ideas.
  They therefore show newly chosen course/topic ideas on the same update,
  without waiting for local-storage rehydration.
- A server error rolls back to the last confirmed snapshot and displays
  **Not saved** globally. No invented success or separate student changes.

## One save status in the sticky app shell

The authenticated app shell now shows one status beside search:

- **Connecting…**: saved plan is loading.
- **Saving…**: one or more operations remain in the serialized queue,
  including student assignments, priorities, groups, topic additions and
  Think Tank saves. Users can keep planning and moving between app pages.
- **Saved**: the existing confirmed save queue is empty, and the plan is
  loaded. This does not claim unsynced browser-only draft notes are stored
  in Supabase.
- **Not saved**: the API failed; the full error is available in the
  indicator's tooltip. The model reverts to its confirmed snapshot.

The provider lives above page navigation, so internal page changes don't
discard in-flight work or hide its status. A browser refresh or external
navigation attempted while Saving triggers the browser's unsaved-changes
confirmation. The former repeated sync labels in the portable and full
Planning Desk are removed; failures remain discoverable from the top bar
even when the desk is closed.

Browser-only display settings and notes are still stored locally using
the existing synchronous local-storage code; they aren't misrepresented
as remotely synced member data.

## Hover rule — no unrelated color

For member List course/topic titles, View/Hide, lightbulb and +/+All:

- **Neutral (not selected)** gets a neutral soft gray/sage hover.
- **Saturated direct choice** gets a deeper version of that subject color.
- **Pale inherited/partial choice** gets a slightly stronger pale version
  of that same subject color.
- **Expanded Hide info** inherits the subject hover only when its row
  already has a Think Tank or My Plan selection. For untouched course/topic
  rows, the familiar neutral Hide background and hover remain.
- Focus-visible keyboard outlines stay apparent and independent of the
  hover; no data mutation is connected to hovering.

## Browser acceptance

1. From a fresh List, click the Geography Grade 12 lightbulb. Its bulb
   should color **on the click**, not after a saving delay. The mini desk
   should include Geography immediately. While the save is pending, the
   app shell should show **Saving…**, then **Saved** after confirmation.
2. Remove the bulb immediately, then repeat the click quickly; check
   colors do not stall and the final saved state survives refresh.
3. Click a single topic's lightbulb in Literature Grades 7–8. Only that
   topic should saturate, with a pale parent and neutral sibling; the
   Think Tank shows the correct partial combined course immediately.
4. Repeat from + / +All and the student editor. Save status should remain
   beside search while student assignments and advanced settings save,
   including if you navigate to Students or another planning page.
5. Click an untouched Geography View/Hide control. The active Hide state
   and its hover should be **neutral**. Click it on a selected Geography,
   Literature or History row: its active state and hover should match
   the subject-colored toolbar. Compare neutral and colored + and bulbs
   at hover.
6. Check narrow screens: save status must stay visible when page search
   collapses; controls should not overlap breadcrumbs or navigation.
7. With a simulated failed API write, verify global **Not saved** and
   rollback rather than a misleading Saved state.
8. With a pending save, navigate inside the app: no warning and the
   indicator remains. Try closing/reloading the browser tab before
   confirmation: the native unsaved-changes warning should appear.
9. Verify signed-out Explore has no private save status or assignment
   controls, and the previously deployed planner remains unchanged.

Automated test: `tests/optimistic-think-tank-feedback.test.mjs` verifies
immediate catalog-derived topic preview and parent/topic color states.
The usual TypeScript and production build checks are also required.
