
-- One-time Demo compatibility: older topic-first plans lack provenance.
-- For saved planned choices with NO whole-course student link and at least
-- one explicit positive child assignment, infer topic-origin rather than
-- falsely coloring every sibling as a course-wide Think Tank idea.
-- This changes only the newly added idea_all column. It never mutates
-- student assignments, topic inclusion, per-student priority or arrangement.
update public.plan_course_choices c
set idea_all=false
from public.workspace_year_plans y
where c.year_plan_id=y.id
  and y.school_year='2027-28' and y.plan_kind='demo'
  and c.stage='planned' and c.idea_all=true
  and not exists (
    select 1 from public.plan_course_students cs
    where cs.course_choice_id=c.id
  )
  and exists (
    select 1 from public.plan_topic_student_overrides o
    where o.course_choice_id=c.id and o.assigned
  )
  -- If a member has already made a new explicit Think Tank topic choice,
  -- do not reinterpret that more recent preference.
  and not exists (
    select 1 from public.plan_course_topics t
    where t.course_choice_id=c.id and t.idea_choice<>'inherit'
  );
