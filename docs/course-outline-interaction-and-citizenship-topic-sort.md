# Contextual Citizenship topic order & independent Course List disclosure — November 13, 2026

## Source-data finding

Airtable's `Curriculum Plans.Plan Sort` currently sorts the shared **Community Read Alouds: Grades 1–12** *Literature* topic as `10105019-400` (2027–28/R4), whereas Citizenship topics start `41…`. This is intentional to Literature's authoring order, but it accidentally puts Community Read Alouds **first** when the member app displays that same topic inside a Citizenship combined course. The Current Events topics already sort late within their own Citizenship context: `4105059-000` (Grades 5–8), `4105099-000` (Grades 9–12).

**Do not edit Airtable Plan Sort or the stored Supabase edition App Presentation Sort to fix this.** The correct order belongs to the displayed *parent → child course relationship*, not to the shared topic itself. It must remain valid when a topic belongs to more than one combined course or subject.

## Contextual topic order (implemented)

`app/courses/topic-order.mjs` exports a pure comparator:

1. Within **Citizenship** combined courses, ordinary connected topics sort by the source `Plan Sort` (and stable ID tie break).
2. A topic whose title begins **Current Events** is placed **second-to-last** if Community Read Alouds is present, otherwise last.
3. A topic whose title begins **Community Read Alouds** is **last**.
4. Within all **other subjects**, use the original `Plan Sort` order, even if that exact Community Read Alouds edition appears in Literature.

The rule applies to future imported course/topic editions with those title families; it does not hard-code source IDs, years, or linked parent IDs. A **newly added course or topic must still pass the Airtable→Supabase→preview publishing workflow to appear in the site**, because the current static JSON is not live-synced. Once included, sorting runs dynamically without manually editing its sort value.

Tests exercise all 14 current Citizenship combined-course outlines and synthetic new topics; also verify that a Literature appearance is unaffected. Topic assignments and all 377 2027–28 draft edition records are unchanged.

## Independent disclosure and scrolling fix (implemented)

Previously `CourseRow` was defined **inside** the parent `CourseExplorer` function. Every page state update redefined its React component type, remounting visible rows and sometimes losing focus/scroll position. Expansion was also tracked in global arrays keyed only by the plan ID:

- The same Advanced Nature Study course appears in **two grade-specific Science choice groups**.
- Shared topics, including Current Events and Community Read Alouds, appear under many different combined courses.
- Opening any one occurrence opened **every appearance** with that same ID.

Now `CourseRow` is a **stable module-level component** that owns its own local `isExpanded` state. Recursively rendered rows are keyed within their respective parent, so a course or topic expands **only in the instance clicked**. Each occurrence generates an independent `useId()` detail target, so `aria-controls` never points to duplicate IDs. Stable row identity preserves browser focus. A layout effect measures and restores the clicked row's screen position when layout changes during expansion/collapse.

**Canonical course planning and comparison are unaffected**: bookmarking a course still uses its one shared plan ID, and comparing it elsewhere selects that same underlying course. Only *visual disclosure state* is per occurrence.

## Acceptance tests for UI review

- Open *Science Choices: Grade 9* Advanced Nature Study. Its Grade 10 appearance should **stay collapsed**, and vice versa.
- Open *Current Events* inside a Grade 7 Citizenship course. Open a second Citizenship course: its own Current Events topic should still be collapsed.
- In Citizenship grades 5–12, **Community Read Alouds is last, Current Events immediately before it**. Grade 4 has Community Read Alouds last, without Current Events.
- In Literature, Community Read Alouds keeps its Literature-context position.
- Open/close courses and nested topics at various scroll depths in a long subject; the clicked row and keyboard focus should remain in view rather than jumping to the subject header.
- Grade multi-select, sticky header, choice-group accent line, planning scratchpad, compare mode, and all source sorting rules should continue functioning.

No Supabase DDL or Airtable writes needed. The 2027–28 Supabase Draft remains unchanged and not publicly routed; only the static Course List app's *contextual presentation* changes.
