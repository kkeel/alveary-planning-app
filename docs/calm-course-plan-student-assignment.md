# Calm course planning and student-assignment review

This replaces the first overexpanded My Plan UI with the course-list review workflow discussed for the Alveary 2027–28 planner. No current-year Webflow/member tools are touched.

## Navigation and expectations

- **Course List:** browsing, filtering and quickly bookmarking options, without assignment pressure.
- **Think Tank:** household possibilities in the familiar subject list with a compact review containing the author's description, placement/combining tips, included/excluded topics and book link. Saving an idea does not imply it will ever be taught.
- **Plan this course** now reveals the student/group picker directly in that same expanded review, without automatically jumping to a different tab or losing reading position. Assigning any student moves the course to My Plan, but the active review stays put until the member navigates away.
- **My Plan:** subject-grouped compact rows in the same visual language as the Course List; initially collapsed per course, so only title, assigned students, chosen priority/arrangement (if set), and meaningful topic count show. Opening a course restores description, guidance, book links, assignments and topic details. **No long "Still considering" to-do list** appears there.
- **Quiet saving:** the Desk header has a fixed-width status: Saving… / Saved / Not saved. No transient paragraphs are inserted above the current course on each mutation.
- **Students:** individually selectable, or use the built-in Family shortcut. Create and reuse named shortcuts such as Younger Students, Older Students, etc. Membership in a group is an assignment-time shortcut; editing a group never rewrites existing student-to-course relationships.
- **Optional planning details per assigned student:** priority (blank / Core / High Interest / Additional); arrangement (Combined / Separate / Both / Later; Later is default). These fields are hidden until the reviewer opens "Priorities & arrangements". The planning selections are intentions, not forced scheduling or new PDF assemblies.
- **Topic-level operations:** every combined course still resolves to its included catalog topic editions; single-topic courses retain an accessible "Adjust topic" section without displaying an overwhelming panel by default. Per-student topic exceptions remain available.
- **All changes are optimistic:** student/group clicks update the in-memory shared store immediately, and writes serialize to one authenticated API for the current Demo workspace. No public or member-browser direct table/RPC permissions.

## Additive data model

The existing parent course and topic selection tables are unchanged. The new **workspace_student_groups** and **workspace_student_group_members** tables are family workspace scoped, with service-role-only privileges and RLS enabled. The existing **plan_course_students** table receives nullable priority and arrangement with Later default. The existing **demo_plan_apply** response includes studentGroups and studentPreferences. New **demo_plan_manage** handles batch group assignments, preference edits and group CRUD with a server-only invoker-rights RPC, and returns the consolidated snapshot. The private Edge Function validates Supabase JWT, trusted Memberstack OIDC identity and an eligible current Memberstack Testing Plan before invoking either RPC.

## Non-destructive tests

- SQL transaction tested adding a combined course, assigning one student by batch, setting a Core priority, creating a named group with a member, deleting the group, and confirming the original student-course assignment was unaffected. All operations rolled back.
- Existing 2027–28 Demo course choices and students were not erased. No automatic migration of legacy client data.
- Existing rules governing independently scheduled/printed/Syllabird-linked topics, topic exclusions and per-topic student overrides are preserved.

## Browser acceptance

1. In Think Tank, open an idea with description/tips. Click "Plan this course" and select a student directly below; confirm the page stays at the same review position.
2. Check My Plan: compact subject rows only. Confirm no "Still considering" list; open the course to see identical review data and book link.
3. Test Family shortcut (assigns all students once), create Younger Students and choose its members, apply that group to another course. Rename/change the group and confirm previous course assignments did not change.
4. Choose optional Core priority and Later arrangement for one student; leave another student's priority blank. Confirm concise row summaries and persistence after refresh.
5. For a combined course, exclude one topic, verify it's not assigned; restore, and verify it is. For a single-topic course, confirm the topic details remain available but collapsed by default.
6. Click multiple student checkboxes quickly: immediate visual updates, no inserting a saving message that shifts the course content.
7. Sign out or switch to an ineligible account: no saved private data or group information should be visible.
8. Verify the 2027–28 Demo's existing courses/assignments and earlier-year Alveary planning tools remain unchanged.

Keep note: a single child's topic may be selected through different course containers. Downstream scheduling and Syllabird generation must deduplicate by student + topic edition + year **while retaining the chosen course provenance**; do not treat a parent combined course as an indivisible teaching unit.
