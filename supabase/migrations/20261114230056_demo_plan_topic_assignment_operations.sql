-- Applied development RPC version 20261114230056.
CREATE OR REPLACE FUNCTION public.demo_plan_apply(p_auth_user_id uuid, p_member_id text, p_workspace_id uuid, p_school_year text, p_action text, p_course_id text DEFAULT NULL::text, p_stage text DEFAULT NULL::text, p_topic_id text DEFAULT NULL::text, p_student_id uuid DEFAULT NULL::uuid, p_include boolean DEFAULT NULL::boolean, p_assign boolean DEFAULT NULL::boolean, p_import jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_link text;
 v_role text;
 v_status text;
 v_release_id uuid;
 v_year_plan_id uuid;
 v_choice_id uuid;
 v_edition_id text;
 v_type text;
 v_topic_edition_id text;
 v_existing uuid;
 v_item jsonb;
 v_exclusion jsonb;
 v_count int;
 v_students jsonb;
 v_courses jsonb;
BEGIN
 IF current_user <> 'service_role' OR p_auth_user_id IS NULL OR
    p_workspace_id IS NULL OR p_member_id !~ '^[0-9a-f]{24}$' OR
    p_school_year <> '2027-28' OR
    p_action NOT IN ('load','import','set_choice','remove_choice','set_stage',
                     'set_topic','set_course_student','set_topic_student') THEN
   RAISE EXCEPTION 'invalid_request';
 END IF;

 -- Idempotent family provisioning; authenticated Memberstack identity was
 -- verified independently by the Edge Function before reaching this RPC.
 INSERT INTO public.member_identity_links
   (auth_user_id,memberstack_member_id,verified_at,verified_source)
 VALUES(p_auth_user_id,p_member_id,now(),'memberstack_oidc')
 ON CONFLICT DO NOTHING;
 SELECT memberstack_member_id INTO v_link FROM public.member_identity_links
 WHERE auth_user_id=p_auth_user_id;
 IF v_link IS DISTINCT FROM p_member_id THEN RAISE EXCEPTION 'identity_mismatch'; END IF;
 INSERT INTO public.workspaces(id,workspace_type,display_name)
 VALUES(p_workspace_id,'family','My Family') ON CONFLICT DO NOTHING;
 IF NOT EXISTS (SELECT 1 FROM public.workspaces WHERE id=p_workspace_id
  AND workspace_type='family') THEN RAISE EXCEPTION 'wrong_workspace'; END IF;
 INSERT INTO public.workspace_memberships(workspace_id,auth_user_id,role,status)
 VALUES(p_workspace_id,p_auth_user_id,'family_owner','active')
 ON CONFLICT(workspace_id,auth_user_id) DO NOTHING;
 SELECT role,status INTO v_role,v_status FROM public.workspace_memberships
 WHERE workspace_id=p_workspace_id AND auth_user_id=p_auth_user_id;
 IF v_role IS DISTINCT FROM 'family_owner' OR v_status IS DISTINCT FROM 'active' THEN
   RAISE EXCEPTION 'workspace_denied';
 END IF;
 SELECT id INTO v_release_id FROM public.catalog_releases WHERE school_year=p_school_year
 ORDER BY revision DESC LIMIT 1;
 IF v_release_id IS NULL THEN RAISE EXCEPTION 'catalog_missing'; END IF;
 INSERT INTO public.workspace_year_plans(workspace_id,school_year,catalog_release_id,plan_kind,state)
 VALUES(p_workspace_id,p_school_year,v_release_id,'demo','draft')
 ON CONFLICT(workspace_id,school_year,plan_kind) DO NOTHING;
 SELECT id,catalog_release_id INTO v_year_plan_id,v_release_id
 FROM public.workspace_year_plans
 WHERE workspace_id=p_workspace_id AND school_year=p_school_year AND plan_kind='demo';
 IF v_year_plan_id IS NULL THEN RAISE EXCEPTION 'year_missing'; END IF;

 IF p_action='import' THEN
   IF jsonb_typeof(p_import) <> 'array' OR jsonb_array_length(p_import)>250 THEN
     RAISE EXCEPTION 'import_invalid';
   END IF;
   FOR v_item IN SELECT value FROM jsonb_array_elements(p_import) LOOP
     IF jsonb_typeof(v_item) <> 'object' OR
       jsonb_typeof(v_item->'courseId') <> 'string' THEN
       RAISE EXCEPTION 'import_invalid';
     END IF;
     p_course_id := v_item->>'courseId';
     SELECT p.plan_type,e.source_edition_id INTO v_type,v_edition_id
     FROM public.catalog_plans p JOIN public.catalog_editions e
     ON p.release_id=e.release_id AND p.source_plan_id=e.source_plan_id
     WHERE p.release_id=v_release_id AND p.source_plan_id=p_course_id;
     IF v_edition_id IS NULL THEN RAISE EXCEPTION 'unknown_course'; END IF;
     INSERT INTO public.plan_course_choices
       (workspace_id,year_plan_id,catalog_release_id,source_plan_id,stage,display_order)
     VALUES(p_workspace_id,v_year_plan_id,v_release_id,p_course_id,'idea',0)
     ON CONFLICT (year_plan_id,source_plan_id) DO NOTHING
     RETURNING id INTO v_choice_id;
     IF v_choice_id IS NOT NULL THEN
       INSERT INTO public.plan_course_topics
         (course_choice_id,catalog_release_id,topic_source_edition_id,included,topic_order)
       SELECT v_choice_id,v_release_id,t.child_source_edition_id,true,
              COALESCE(t.display_order,0)
       FROM public.catalog_edition_topics t
       WHERE v_type='Combined Course' AND t.release_id=v_release_id
         AND t.parent_source_edition_id=v_edition_id
       UNION ALL
       SELECT v_choice_id,v_release_id,v_edition_id,true,0
       WHERE v_type <> 'Combined Course';
       -- Legacy Think Tank exclusions refer to the topic's PLAN ID.
       IF v_item ? 'excludedTopicIds' THEN
         IF jsonb_typeof(v_item->'excludedTopicIds') <> 'array' OR
            jsonb_array_length(v_item->'excludedTopicIds') > 60 THEN
           RAISE EXCEPTION 'import_topics_invalid';
         END IF;
         FOR v_exclusion IN SELECT value FROM jsonb_array_elements(v_item->'excludedTopicIds') LOOP
           IF jsonb_typeof(v_exclusion) <> 'string' THEN RAISE EXCEPTION 'import_topics_invalid'; END IF;
           UPDATE public.plan_course_topics ct SET included=false
           FROM public.catalog_editions te
           WHERE ct.course_choice_id=v_choice_id AND ct.catalog_release_id=v_release_id
           AND te.release_id=v_release_id
           AND ct.topic_source_edition_id=te.source_edition_id
           AND te.source_plan_id=v_exclusion #>> '{}';
           -- Fail if an excluded ID wasn't an actual child in this course.
           IF NOT FOUND THEN RAISE EXCEPTION 'invalid_topic_exclusion'; END IF;
         END LOOP;
       END IF;
     END IF;
     v_choice_id := NULL;
   END LOOP;

 ELSIF p_action <> 'load' THEN
   IF p_course_id IS NULL THEN RAISE EXCEPTION 'course_required'; END IF;
   SELECT p.plan_type,e.source_edition_id INTO v_type,v_edition_id
   FROM public.catalog_plans p JOIN public.catalog_editions e
    ON e.release_id=p.release_id AND e.source_plan_id=p.source_plan_id
   WHERE p.release_id=v_release_id AND p.source_plan_id=p_course_id;
   IF v_edition_id IS NULL THEN RAISE EXCEPTION 'unknown_course'; END IF;

   IF p_action='set_choice' THEN
     IF p_stage NOT IN ('idea','planned') THEN RAISE EXCEPTION 'invalid_stage'; END IF;
     INSERT INTO public.plan_course_choices
        (workspace_id,year_plan_id,catalog_release_id,source_plan_id,stage,display_order)
     VALUES(p_workspace_id,v_year_plan_id,v_release_id,p_course_id,p_stage,0)
     ON CONFLICT (year_plan_id,source_plan_id) DO UPDATE SET
       stage=CASE WHEN EXCLUDED.stage='planned' THEN 'planned'
                  ELSE public.plan_course_choices.stage END
     RETURNING id INTO v_choice_id;
     INSERT INTO public.plan_course_topics
       (course_choice_id,catalog_release_id,topic_source_edition_id,included,topic_order)
     SELECT v_choice_id,v_release_id,t.child_source_edition_id,true,COALESCE(t.display_order,0)
       FROM public.catalog_edition_topics t
       WHERE v_type='Combined Course' AND t.release_id=v_release_id
         AND t.parent_source_edition_id=v_edition_id
     UNION ALL SELECT v_choice_id,v_release_id,v_edition_id,true,0
       WHERE v_type<>'Combined Course'
     ON CONFLICT(course_choice_id,topic_source_edition_id) DO NOTHING;
   ELSE
     SELECT id INTO v_choice_id FROM public.plan_course_choices
       WHERE year_plan_id=v_year_plan_id AND source_plan_id=p_course_id;
     IF v_choice_id IS NULL THEN RAISE EXCEPTION 'choice_missing'; END IF;
     IF p_action='remove_choice' THEN
       DELETE FROM public.plan_course_choices WHERE id=v_choice_id;
     ELSIF p_action='set_stage' THEN
       IF p_stage NOT IN ('idea','planned') THEN RAISE EXCEPTION 'invalid_stage'; END IF;
       UPDATE public.plan_course_choices SET stage=p_stage WHERE id=v_choice_id;
     ELSIF p_action='set_topic' OR p_action='set_topic_student' THEN
       -- UI identifies topics by source PLAN ID; store the linked
       -- catalog edition ID as the downstream operational unit.
       SELECT t.topic_source_edition_id INTO v_topic_edition_id
       FROM public.plan_course_topics t JOIN public.catalog_editions e
         ON e.release_id=t.catalog_release_id
          AND e.source_edition_id=t.topic_source_edition_id
       WHERE t.course_choice_id=v_choice_id AND e.source_plan_id=p_topic_id;
       IF v_topic_edition_id IS NULL THEN RAISE EXCEPTION 'topic_not_in_course'; END IF;
       IF p_action='set_topic' THEN
         IF p_include IS NULL THEN RAISE EXCEPTION 'invalid_inclusion'; END IF;
         UPDATE public.plan_course_topics SET included=p_include
           WHERE course_choice_id=v_choice_id
           AND topic_source_edition_id=v_topic_edition_id;
       END IF;
     END IF;

     IF p_action IN ('set_course_student','set_topic_student') THEN
       IF p_assign IS NULL OR p_student_id IS NULL OR NOT EXISTS
         (SELECT 1 FROM public.student_year_placements sp
          JOIN public.students s ON s.id=sp.student_id AND s.workspace_id=sp.workspace_id
          WHERE sp.student_id=p_student_id AND sp.year_plan_id=v_year_plan_id
           AND sp.workspace_id=p_workspace_id AND sp.enrollment_status='active'
           AND s.archived_at IS NULL) THEN
           RAISE EXCEPTION 'invalid_student';
       END IF;
       IF p_action='set_course_student' THEN
         IF p_assign THEN
           INSERT INTO public.plan_course_students(course_choice_id,workspace_id,student_id)
           VALUES(v_choice_id,p_workspace_id,p_student_id) ON CONFLICT DO NOTHING;
           UPDATE public.plan_course_choices SET stage='planned' WHERE id=v_choice_id;
         ELSE
           DELETE FROM public.plan_course_students
           WHERE course_choice_id=v_choice_id AND student_id=p_student_id;
         END IF;
         -- A one-click group action resets individual exceptions for that
         -- student; it always applies to every included topic.
         DELETE FROM public.plan_topic_student_overrides
         WHERE course_choice_id=v_choice_id AND student_id=p_student_id;
       ELSE
         INSERT INTO public.plan_topic_student_overrides
           (course_choice_id,catalog_release_id,topic_source_edition_id,workspace_id,student_id,assigned)
         VALUES(v_choice_id,v_release_id,v_topic_edition_id,p_workspace_id,p_student_id,p_assign)
         ON CONFLICT(course_choice_id,topic_source_edition_id,student_id)
         DO UPDATE SET assigned=EXCLUDED.assigned;
         IF p_assign THEN UPDATE public.plan_course_choices
           SET stage='planned' WHERE id=v_choice_id; END IF;
       END IF;
     END IF;
   END IF;
 END IF;

 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'id',s.id::text,'displayName',s.display_name,'gradeLevel',sp.grade_level
 ) ORDER BY s.created_at),'[]'::jsonb) INTO v_students
 FROM public.students s JOIN public.student_year_placements sp
 ON sp.student_id=s.id AND sp.workspace_id=s.workspace_id
 WHERE s.workspace_id=p_workspace_id AND sp.year_plan_id=v_year_plan_id
   AND s.archived_at IS NULL AND sp.enrollment_status='active';

 SELECT COALESCE(jsonb_agg(jsonb_build_object(
   'courseId',c.source_plan_id,'stage',c.stage,
   'topics',COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'topicId',te.source_plan_id,'topicEditionId',t.topic_source_edition_id,
      'included',t.included,'order',t.topic_order)
      ORDER BY t.topic_order,te.source_plan_id)
      FROM public.plan_course_topics t JOIN public.catalog_editions te
      ON te.release_id=t.catalog_release_id AND te.source_edition_id=t.topic_source_edition_id
      WHERE t.course_choice_id=c.id),'[]'::jsonb),
   'studentIds',COALESCE((SELECT jsonb_agg(s.student_id::text)
      FROM public.plan_course_students s WHERE s.course_choice_id=c.id),'[]'::jsonb),
   'overrides',COALESCE((SELECT jsonb_agg(jsonb_build_object(
     'topicId',te.source_plan_id,'studentId',o.student_id::text,'assigned',o.assigned))
     FROM public.plan_topic_student_overrides o
     JOIN public.catalog_editions te ON te.release_id=o.catalog_release_id
       AND te.source_edition_id=o.topic_source_edition_id
     WHERE o.course_choice_id=c.id),'[]'::jsonb)
 ) ORDER BY c.created_at,c.id),'[]'::jsonb) INTO v_courses
 FROM public.plan_course_choices c WHERE c.year_plan_id=v_year_plan_id;

 RETURN jsonb_build_object('schoolYear',p_school_year,'planKind','demo',
   'students',v_students,'courses',v_courses);
END;
$function$

REVOKE ALL ON FUNCTION public.demo_plan_apply(uuid,text,uuid,text,text,text,text,text,uuid,boolean,boolean,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.demo_plan_apply(uuid,text,uuid,text,text,text,text,text,uuid,boolean,boolean,jsonb) TO service_role;
