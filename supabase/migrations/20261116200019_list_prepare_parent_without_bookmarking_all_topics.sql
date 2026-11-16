CREATE OR REPLACE FUNCTION public.demo_plan_list_action(p_auth_user_id uuid, p_member_id text, p_workspace_id uuid, p_school_year text, p_action text, p_course_id text, p_topic_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
 v_year uuid;v_release uuid;v_choice uuid;v_parent_edition text;v_type text;
 v_topic_edition text;v_created boolean:=false;v_all boolean;v_idea text;
 v_selected boolean;
begin
 if current_user <> 'service_role' or p_auth_user_id is null
    or p_workspace_id is null or p_member_id !~ '^[0-9a-f]{24}$'
    or p_school_year <> '2027-28' or p_course_id is null
    or p_action not in ('toggle_idea','clear_plan','prepare_plan')
 then raise exception 'invalid_request';end if;
 if not exists (select 1 from public.member_identity_links l
   where l.auth_user_id=p_auth_user_id and l.memberstack_member_id=p_member_id)
   or not exists (select 1 from public.workspace_memberships m
     where m.workspace_id=p_workspace_id and m.auth_user_id=p_auth_user_id
     and m.role='family_owner' and m.status='active')
 then raise exception 'workspace_access_denied';end if;
 select y.id,y.catalog_release_id into v_year,v_release
 from public.workspace_year_plans y where y.workspace_id=p_workspace_id
   and y.school_year=p_school_year and y.plan_kind='demo';
 if v_year is null then raise exception 'year_plan_missing';end if;
 select p.plan_type,e.source_edition_id into v_type,v_parent_edition
 from public.catalog_plans p join public.catalog_editions e
  on e.release_id=p.release_id and e.source_plan_id=p.source_plan_id
 where p.release_id=v_release and p.source_plan_id=p_course_id;
 if v_parent_edition is null or v_type='Topic' then raise exception 'invalid_parent';end if;
 select id into v_choice from public.plan_course_choices
 where workspace_id=p_workspace_id and year_plan_id=v_year
  and catalog_release_id=v_release and source_plan_id=p_course_id for update;
 if v_choice is null then
   if p_action not in ('toggle_idea','prepare_plan') then raise exception 'course_not_saved';end if;
   insert into public.plan_course_choices
    (workspace_id,year_plan_id,catalog_release_id,source_plan_id,stage,display_order,idea_all)
    values(p_workspace_id,v_year,v_release,p_course_id,'idea',0,
      p_action='toggle_idea' and p_topic_id is null)
   on conflict(year_plan_id,source_plan_id) do nothing returning id into v_choice;
   if v_choice is null then
     select id into v_choice from public.plan_course_choices
     where year_plan_id=v_year and source_plan_id=p_course_id for update;
   else
     v_created:=true;
     insert into public.plan_course_topics
       (course_choice_id,catalog_release_id,topic_source_edition_id,included,topic_order)
     select v_choice,v_release,t.child_source_edition_id,true,coalesce(t.display_order,0)
     from public.catalog_edition_topics t
     where v_type='Combined Course' and t.release_id=v_release
       and t.parent_source_edition_id=v_parent_edition
     union all select v_choice,v_release,v_parent_edition,true,0
       where v_type <> 'Combined Course';
   end if;
 end if;
 if p_topic_id is not null then
  select ct.topic_source_edition_id into v_topic_edition
  from public.plan_course_topics ct join public.catalog_editions te
   on te.release_id=ct.catalog_release_id
     and te.source_edition_id=ct.topic_source_edition_id
  where ct.course_choice_id=v_choice and ct.catalog_release_id=v_release
    and te.source_plan_id=p_topic_id and ct.included;
  if v_topic_edition is null then raise exception 'topic_not_included';end if;
 end if;
 if p_action='prepare_plan' then
   -- The parent is now saved; a direct topic-level Plan must NOT
   -- turn all the other unselected topics into Think Tank ideas.
   null;
 elsif p_action='toggle_idea' then
  if v_created then
    if v_topic_edition is not null then
      update public.plan_course_topics set idea_choice='on'
      where course_choice_id=v_choice and topic_source_edition_id=v_topic_edition;
    end if;
  elsif v_topic_edition is null then
    -- A pale course bulb means individual topics were selected; one
    -- course-level click upgrades the selection to ALL topics. A second
    -- click on the saturated course bulb deselects the entire idea.
    select idea_all into v_all from public.plan_course_choices where id=v_choice;
    update public.plan_course_choices set idea_all=not v_all where id=v_choice;
    update public.plan_course_topics set idea_choice='inherit'
      where course_choice_id=v_choice;
  else
    if public.demo_plan_topic_has_students(v_choice,v_topic_edition) then
      raise exception 'topic_already_planned';
    end if;
    select c.idea_all,t.idea_choice into v_all,v_idea
    from public.plan_course_choices c join public.plan_course_topics t
     on t.course_choice_id=c.id and t.topic_source_edition_id=v_topic_edition
    where c.id=v_choice;
    v_selected := v_idea='on' or (v_idea='inherit' and v_all);
    update public.plan_course_topics set idea_choice=case
       when v_selected and v_all then 'off'
       when v_selected then 'inherit'
       when v_all then 'inherit' else 'on' end
    where course_choice_id=v_choice and topic_source_edition_id=v_topic_edition;
  end if;
 else
  if v_topic_edition is null then
    delete from public.plan_topic_student_overrides where course_choice_id=v_choice;
    delete from public.plan_course_students where course_choice_id=v_choice;
    update public.plan_course_choices set stage='idea',idea_all=true where id=v_choice;
    update public.plan_course_topics set idea_choice='inherit' where course_choice_id=v_choice;
  else
    insert into public.plan_topic_student_overrides
      (course_choice_id,catalog_release_id,topic_source_edition_id,
       workspace_id,student_id,assigned)
    select v_choice,v_release,v_topic_edition,p_workspace_id,z.student_id,false
    from (
      select cs.student_id from public.plan_course_students cs
      where cs.course_choice_id=v_choice
      union
      select o.student_id from public.plan_topic_student_overrides o
      where o.course_choice_id=v_choice
        and o.topic_source_edition_id=v_topic_edition and o.assigned
    ) z
    on conflict(course_choice_id,topic_source_edition_id,student_id)
      do update set assigned=false;
    update public.plan_course_topics set idea_choice='on'
    where course_choice_id=v_choice and topic_source_edition_id=v_topic_edition;
    perform public.demo_plan_demote_if_unassigned(v_choice);
  end if;
 end if;
 return public.demo_plan_apply(p_auth_user_id,p_member_id,p_workspace_id,
  p_school_year,'load');
end;$function$;
