# Planning Desk: concise shared-topic summary, description and spacing

This is a non-destructive UI refinement to the 2027–28 **Demo** planner.

## Expected appearance
- Think Tank: opening a course **automatically displays** its description and placement/combining tips as ordinary content, before the nested topics. No description toggle here.
- My Plan: the course row offers **one** "Description & tips" action which reveals both blocks together. It works without opening the nested topic list; there are no secondary info toggles.
- Default My Plan course list only summarizes students, chosen priorities or arrangements, and an understated **↔** where an actual included topic is also assigned through another *planned* course grouping. A mere catalog overlap or an unassigned topic does not count.
- Open a combined course: each topic still has its own title, remove/restore action, and optional student exception controls. Beside a shared topic is a short summary like **↔ Troy (other course title)**; the full other-course/student mapping is also in the tooltip. Topic editions, not display titles, are compared.
- Count labels such as "5 of 5 topics" are hidden. If topics were excluded, the course and topic section show a concise **Customized: 4 of 5 topics** count.
- Student checkboxes and Family/named-group shortcut buttons each have explicit vertical spacing, wrapping safely in narrower Planning Desk layouts so border edges cannot collide.

## Safety and acceptance
- No Supabase schema or Memberstack changes, and no existing student/course/assignment data is modified by this patch.
- In My Plan, open a course with no customization: count should be absent. Exclude one topic: customized count should appear; restore it: count should disappear.
- Verify ↔ is absent for a topic only *available* through another course but not actually assigned to a student. Verify a shared included topic assigned through another My Plan choice shows its students alongside the topic.
- Check an example with a topic assigned to a different student under a different combined course, and another with a per-student topic override.
- Think Tank review opens description/tips automatically; My Plan's single info control shows/hides both without opening the course.
- Check responsive Student + Family/+Group chip rows at desktop and mobile widths; no touching or overlap.
- Existing saved selections, topic exclusions, and student group preferences must remain intact.
