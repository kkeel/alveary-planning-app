-- 2027-28 Demo: shared course/topic arrangement defaults, independent of
-- per-student overrides. No catalog or other plan-kind tables are changed.
create table if not exists public.plan_shared_arrangements (
 id uuid primary key default gen_random_uuid(),
 workspace_id uuid not null,
 course_choice_id uuid not null,
 topic_source_edition_id text,
 arrangement text not null check (arrangement in ('Combined','Separate','Later')),
 updated_at timestamptz not null default now(),
 constraint plan_shared_arrangement_parent_fkey
   foreign key (course_choice_id,workspace_id)
   references public.plan_course_choices(id,workspace_id) on delete cascade,
 constraint plan_shared_arrangement_topic_fkey
   foreign key (course_choice_id,topic_source_edition_id)
   references public.plan_course_topics(course_choice_id,topic_source_edition_id) on delete cascade
);
create unique index if not exists plan_shared_arrangement_scope_unique
 on public.plan_shared_arrangements(course_choice_id,topic_source_edition_id) nulls not distinct;
create index if not exists plan_shared_arrangements_workspace_idx
 on public.plan_shared_arrangements(workspace_id,course_choice_id);
alter table public.plan_shared_arrangements enable row level security;
revoke all on public.plan_shared_arrangements from public,anon,authenticated;
grant all on public.plan_shared_arrangements to service_role;

create or replace function public.demo_plan_shared_arrangements(
 p_auth_user_id uuid,p_member_id text,p_workspace_id uuid,p_school_year text,
 p_action text,p_course_id text default null,p_topic_id text default null,
 p_arrangement text default null
) returns jsonb language plpgsql set search_path to ''
as $function$
declare
 v_year uuid; v_release uuid; v_choice uuid; v_topic_edition text;
 v_count int; v_result jsonb;
begin
 if current_user <> 'service_role' or p_auth_user_id is null or p_workspace_id is null
   or p_member_id !~ '^[0-9a-f]{24}$' or p_school_year <> '2027-28'
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
 from public.workspace_year_plans y where y.workspace_id=p_workspace_id
  and y.school_year=p_school_year and y.plan_kind='demo';
 if v_year is null then raise exception 'year_plan_missing'; end if;

 if p_action='set' then
  if p_course_id is null or (p_arrangement is not null and
    p_arrangement not in ('Combined','Separate','Later'))
  then raise exception 'invalid_arrangement'; end if;
  select c.id into v_choice from public.plan_course_choices c
  where c.workspace_id=p_workspace_id and c.year_plan_id=v_year
   and c.catalog_release_id=v_release and c.source_plan_id=p_course_id;
  if v_choice is null then raise exception 'course_not_saved'; end if;
  if p_topic_id is not null then
   select count(*),min(ct.topic_source_edition_id) into v_count,v_topic_edition
   from public.plan_course_topics ct
   join public.catalog_editions e
    on e.release_id=ct.catalog_release_id
    and e.source_edition_id=ct.topic_source_edition_id
   where ct.course_choice_id=v_choice and ct.catalog_release_id=v_release
    and e.source_plan_id=p_topic_id and ct.included;
   if v_count <> 1 then raise exception 'topic_not_included_in_parent'; end if;
  end if;
  delete from public.plan_shared_arrangements a
   where a.course_choice_id=v_choice and a.workspace_id=p_workspace_id
    and a.topic_source_edition_id is not distinct from v_topic_edition;
  if p_arrangement is not null then
   insert into public.plan_shared_arrangements
    (workspace_id,course_choice_id,topic_source_edition_id,arrangement)
   values (p_workspace_id,v_choice,v_topic_edition,p_arrangement);
  end if;
 end if;
 select coalesce(jsonb_agg(jsonb_build_object(
  'courseId',c.source_plan_id,'topicId',e.source_plan_id,
  'arrangement',a.arrangement
 ) order by c.source_plan_id,e.source_plan_id nulls first),'[]'::jsonb)
 into v_result from public.plan_shared_arrangements a
 join public.plan_course_choices c on c.id=a.course_choice_id
 left join public.catalog_editions e on e.release_id=c.catalog_release_id
  and e.source_edition_id=a.topic_source_edition_id
 where c.workspace_id=p_workspace_id and c.year_plan_id=v_year;
 return v_result;
end;$function$;
revoke all on function public.demo_plan_shared_arrangements(
 uuid,text,uuid,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.demo_plan_shared_arrangements(
 uuid,text,uuid,text,text,text,text,text) to service_role;
