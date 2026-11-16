-- 2027–28 Demo: per-student course arrangement defaults and optional
-- per-topic arrangement overrides, independent of assignment membership.
-- "Later" is a deliberate topic-level override; absence inherits the parent.
create table public.plan_assignment_arrangements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null,
  course_choice_id uuid not null,
  student_id uuid not null,
  topic_source_edition_id text,
  arrangement text not null,
  updated_at timestamptz not null default now(),
  constraint plan_assignment_arrangements_value_check
    check (arrangement in ('Combined','Separate','Later','Both')),
  constraint plan_assignment_arrangements_course_workspace_fkey
    foreign key (course_choice_id,workspace_id)
      references public.plan_course_choices(id,workspace_id) on delete cascade,
  constraint plan_assignment_arrangements_student_workspace_fkey
    foreign key (student_id,workspace_id)
      references public.students(id,workspace_id) on delete cascade,
  constraint plan_assignment_arrangements_topic_parent_fkey
    foreign key (course_choice_id,topic_source_edition_id)
      references public.plan_course_topics(course_choice_id,topic_source_edition_id)
      on delete cascade
);
create unique index plan_assignment_arrangements_course_unique
 on public.plan_assignment_arrangements(course_choice_id,student_id)
 where topic_source_edition_id is null;
create unique index plan_assignment_arrangements_topic_unique
 on public.plan_assignment_arrangements(course_choice_id,topic_source_edition_id,student_id)
 where topic_source_edition_id is not null;
create index plan_assignment_arrangements_workspace_idx
 on public.plan_assignment_arrangements(workspace_id,course_choice_id);

alter table public.plan_assignment_arrangements enable row level security;
revoke all on table public.plan_assignment_arrangements from public,anon,authenticated;
grant select,insert,update,delete on public.plan_assignment_arrangements to service_role;

-- Preserve every existing Demo 2027–28 course arrangement without
-- modifying plan_course_students assignments or historical 'Both' values.
-- 'Both' remains readable for existing plans but is not a new UI option.
insert into public.plan_assignment_arrangements
  (workspace_id,course_choice_id,student_id,topic_source_edition_id,arrangement)
select cs.workspace_id,cs.course_choice_id,cs.student_id,null,cs.arrangement
from public.plan_course_students cs
join public.plan_course_choices c on c.id=cs.course_choice_id
join public.workspace_year_plans y on y.id=c.year_plan_id
where y.school_year='2027-28' and y.plan_kind='demo'
  and cs.arrangement is not null
on conflict do nothing;

-- Only the authenticated + entitled server-side service role may use this
-- security-invoker function. Every write verifies owner, year, active student,
-- included child topic edition, parent course and its workspace.

CREATE OR REPLACE FUNCTION public.demo_plan_arrangements(p_auth_user_id uuid, p_member_id text, p_workspace_id uuid, p_school_year text, p_action text, p_course_id text DEFAULT NULL::text, p_student_id uuid DEFAULT NULL::uuid, p_topic_id text DEFAULT NULL::text, p_arrangement text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_year uuid;
 v_release uuid;
 v_choice uuid;
 v_topic_edition text;
 v_count integer;
 v_result jsonb;
begin
 if current_user <> 'service_role' or p_auth_user_id is null
    or p_workspace_id is null or p_member_id !~ '^[0-9a-f]{24}$'
    or p_school_year <> '2027-28'
    or p_action not in ('load','set')
 then raise exception 'request_invalid'; end if;

 if not exists (
   select 1 from public.member_identity_links l
    where l.auth_user_id=p_auth_user_id and l.memberstack_member_id=p_member_id
 ) or not exists (
   select 1 from public.workspace_memberships m
    where m.auth_user_id=p_auth_user_id and m.workspace_id=p_workspace_id
      and m.role='family_owner' and m.status='active'
 ) then raise exception 'workspace_access_denied'; end if;

 select y.id,y.catalog_release_id into v_year,v_release
 from public.workspace_year_plans y
 where y.workspace_id=p_workspace_id and y.school_year=p_school_year
   and y.plan_kind='demo';
 if v_year is null then raise exception 'year_plan_missing'; end if;

 if p_action='set' then
   if p_course_id is null or p_student_id is null
      or (p_arrangement is not null and p_arrangement not in
          ('Combined','Separate','Later'))
   then raise exception 'invalid_arrangement'; end if;

   select c.id into v_choice from public.plan_course_choices c
   where c.workspace_id=p_workspace_id and c.year_plan_id=v_year
     and c.catalog_release_id=v_release and c.source_plan_id=p_course_id;
   if v_choice is null then raise exception 'course_not_saved'; end if;

   select count(*) into v_count
   from public.students s join public.student_year_placements sp
     on sp.student_id=s.id and sp.workspace_id=s.workspace_id
   where s.id=p_student_id and s.workspace_id=p_workspace_id
     and sp.year_plan_id=v_year and sp.enrollment_status='active'
     and s.archived_at is null;
   if v_count <> 1 then raise exception 'student_not_active'; end if;

   if p_topic_id is not null then
     select count(*),min(ct.topic_source_edition_id)
       into v_count,v_topic_edition
     from public.plan_course_topics ct
     join public.catalog_editions e
       on e.release_id=ct.catalog_release_id
      and e.source_edition_id=ct.topic_source_edition_id
     where ct.course_choice_id=v_choice
       and ct.catalog_release_id=v_release
       and e.source_plan_id=p_topic_id and ct.included;
     if v_count <> 1 then raise exception 'topic_not_included_in_parent'; end if;
   end if;

   delete from public.plan_assignment_arrangements pp
   where pp.course_choice_id=v_choice and pp.workspace_id=p_workspace_id
     and pp.student_id=p_student_id
     and pp.topic_source_edition_id is not distinct from v_topic_edition;

   if p_arrangement is not null then
     insert into public.plan_assignment_arrangements
       (workspace_id,course_choice_id,student_id,topic_source_edition_id,arrangement)
     values (p_workspace_id,v_choice,p_student_id,v_topic_edition,p_arrangement);
   end if;
 end if;

 select coalesce(jsonb_agg(jsonb_build_object(
   'courseId',c.source_plan_id,
   'studentId',pp.student_id::text,
   'topicId',e.source_plan_id,
   'arrangement',pp.arrangement
 ) order by c.source_plan_id,pp.student_id,e.source_plan_id nulls first),'[]'::jsonb)
 into v_result
 from public.plan_assignment_arrangements pp
 join public.plan_course_choices c on c.id=pp.course_choice_id
 left join public.catalog_editions e on e.release_id=c.catalog_release_id
   and e.source_edition_id=pp.topic_source_edition_id
 where c.workspace_id=p_workspace_id and c.year_plan_id=v_year;
 return v_result;
end;
$function$
;

revoke all on function public.demo_plan_arrangements(uuid,text,uuid,text,text,text,uuid,text,text)
  from public,anon,authenticated;
grant execute on function public.demo_plan_arrangements(uuid,text,uuid,text,text,text,uuid,text,text)
  to service_role;
