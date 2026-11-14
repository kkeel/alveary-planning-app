-- Additive: preserve all existing Demo courses and student assignments.
ALTER TABLE public.plan_course_students
  ADD COLUMN IF NOT EXISTS priority text NULL,
  ADD COLUMN IF NOT EXISTS arrangement text NOT NULL DEFAULT 'Later';
DO $constraints$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='plan_course_student_priority_check') THEN
    ALTER TABLE public.plan_course_students ADD CONSTRAINT plan_course_student_priority_check
      CHECK (priority IS NULL OR priority IN ('Core','High Interest','Additional'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='plan_course_student_arrangement_check') THEN
    ALTER TABLE public.plan_course_students ADD CONSTRAINT plan_course_student_arrangement_check
      CHECK (arrangement IN ('Combined','Separate','Both','Later'));
  END IF;
END $constraints$;
CREATE TABLE IF NOT EXISTS public.workspace_student_groups (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
 name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 50),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(id,workspace_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS workspace_student_groups_unique_name
 ON public.workspace_student_groups(workspace_id, lower(btrim(name)));
CREATE TABLE IF NOT EXISTS public.workspace_student_group_members (
 group_id uuid NOT NULL, workspace_id uuid NOT NULL, student_id uuid NOT NULL,
 PRIMARY KEY(group_id,student_id),
 FOREIGN KEY(group_id,workspace_id)
  REFERENCES public.workspace_student_groups(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY(student_id,workspace_id)
  REFERENCES public.students(id,workspace_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS workspace_group_members_student ON public.workspace_student_group_members(student_id);
ALTER TABLE public.workspace_student_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_student_group_members ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.workspace_student_groups,public.workspace_student_group_members FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.workspace_student_groups,public.workspace_student_group_members TO service_role;

-- Read-only planning response includes saved student groups and optional
-- student-specific priorities and arrangement intentions.
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
 v_groups jsonb;
 v_preferences jsonb;
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

 -- Optional member-defined shortcuts: changing a group never rewrites
 -- historical course-to-student relationships.
 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'id',g.id::text,'name',g.name,'studentIds',coalesce((
     SELECT jsonb_agg(gm.student_id::text ORDER BY st.display_name)
       FROM public.workspace_student_group_members gm
       JOIN public.students st ON st.id=gm.student_id AND st.workspace_id=gm.workspace_id
       WHERE gm.group_id=g.id AND st.archived_at IS NULL),'[]'::jsonb))
   ORDER BY g.name),'[]'::jsonb)
 INTO v_groups FROM public.workspace_student_groups g WHERE g.workspace_id=p_workspace_id;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'courseId',ch.source_plan_id,'studentId',link.student_id::text,
   'priority',link.priority,'arrangement',link.arrangement)
   ORDER BY ch.source_plan_id,link.student_id),'[]'::jsonb)
 INTO v_preferences
 FROM public.plan_course_students link JOIN public.plan_course_choices ch
   ON ch.id=link.course_choice_id
 WHERE ch.workspace_id=p_workspace_id AND ch.year_plan_id=v_year_plan_id;

 RETURN jsonb_build_object('schoolYear',p_school_year,'planKind','demo',
   'students',v_students,'courses',v_courses,
   'studentGroups',v_groups,'studentPreferences',v_preferences);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.demo_plan_manage(p_auth_user_id uuid, p_member_id text, p_workspace_id uuid, p_school_year text, p_action text, p_course_id text DEFAULT NULL::text, p_student_ids uuid[] DEFAULT NULL::uuid[], p_student_id uuid DEFAULT NULL::uuid, p_assign boolean DEFAULT NULL::boolean, p_priority text DEFAULT NULL::text, p_arrangement text DEFAULT NULL::text, p_group_id uuid DEFAULT NULL::uuid, p_group_name text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
 v_year uuid;
 v_choice uuid;
 v_release uuid;
 v_group uuid;
 v_count integer;
 v_requested integer;
 v_snapshot jsonb;
 v_groups jsonb;
 v_preferences jsonb;
BEGIN
 IF current_user <> 'service_role' OR p_auth_user_id IS NULL OR p_workspace_id IS NULL
 OR p_member_id !~ '^[0-9a-f]{24}$' OR p_school_year <> '2027-28'
 OR p_action NOT IN ('load','batch_assign','set_preference','upsert_group','delete_group')
 THEN RAISE EXCEPTION 'request_invalid'; END IF;
 IF NOT EXISTS (
  SELECT 1 FROM public.member_identity_links l
   WHERE l.auth_user_id=p_auth_user_id AND l.memberstack_member_id=p_member_id
 ) OR NOT EXISTS (
  SELECT 1 FROM public.workspace_memberships m
   WHERE m.auth_user_id=p_auth_user_id AND m.workspace_id=p_workspace_id
   AND m.role='family_owner' AND m.status='active'
 ) THEN RAISE EXCEPTION 'workspace_access_denied'; END IF;

 SELECT id,catalog_release_id INTO v_year,v_release FROM public.workspace_year_plans
 WHERE workspace_id=p_workspace_id AND school_year=p_school_year AND plan_kind='demo';
 IF v_year IS NULL THEN RAISE EXCEPTION 'year_plan_missing'; END IF;

 IF p_action IN ('batch_assign','set_preference') THEN
  SELECT id INTO v_choice FROM public.plan_course_choices
    WHERE year_plan_id=v_year AND workspace_id=p_workspace_id
      AND catalog_release_id=v_release AND source_plan_id=p_course_id;
  IF v_choice IS NULL THEN RAISE EXCEPTION 'course_not_saved'; END IF;
 END IF;

 IF p_action='batch_assign' THEN
  IF p_assign IS NULL OR p_student_ids IS NULL OR
    coalesce(array_length(p_student_ids,1),0)=0 OR
    coalesce(array_length(p_student_ids,1),0)>30 THEN
    RAISE EXCEPTION 'invalid_assignment'; END IF;
  SELECT count(DISTINCT z.id) INTO v_requested FROM unnest(p_student_ids) z(id);
  SELECT count(DISTINCT s.id) INTO v_count
   FROM public.students s JOIN public.student_year_placements sp
    ON sp.student_id=s.id AND sp.workspace_id=s.workspace_id
   WHERE s.id=ANY(p_student_ids) AND s.workspace_id=p_workspace_id
    AND sp.year_plan_id=v_year AND sp.enrollment_status='active' AND s.archived_at IS NULL;
  IF v_count IS DISTINCT FROM v_requested OR v_requested<1 THEN
    RAISE EXCEPTION 'invalid_students'; END IF;
  IF p_assign THEN
    INSERT INTO public.plan_course_students(course_choice_id,workspace_id,student_id)
      SELECT v_choice,p_workspace_id,distinct_ids.id
      FROM (SELECT DISTINCT unnest(p_student_ids) AS id) distinct_ids
      ON CONFLICT(course_choice_id,student_id) DO NOTHING;
    UPDATE public.plan_course_choices SET stage='planned' WHERE id=v_choice;
  ELSE
    DELETE FROM public.plan_course_students
    WHERE course_choice_id=v_choice AND student_id=ANY(p_student_ids);
  END IF;
  -- A group click is a fresh command to apply all *included* topics.
  DELETE FROM public.plan_topic_student_overrides
   WHERE course_choice_id=v_choice AND student_id=ANY(p_student_ids);

 ELSIF p_action='set_preference' THEN
  IF p_student_id IS NULL OR
     (p_priority IS NOT NULL AND p_priority NOT IN ('Core','High Interest','Additional')) OR
     p_arrangement NOT IN ('Combined','Separate','Both','Later')
  THEN RAISE EXCEPTION 'invalid_preference'; END IF;
  UPDATE public.plan_course_students SET
    priority=p_priority, arrangement=p_arrangement
    WHERE course_choice_id=v_choice AND workspace_id=p_workspace_id
      AND student_id=p_student_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'student_not_assigned'; END IF;

 ELSIF p_action='upsert_group' THEN
  IF p_group_name IS NULL OR char_length(btrim(p_group_name)) NOT BETWEEN 1 AND 50
      OR p_group_name ~ '[[:cntrl:]]' OR coalesce(array_length(p_student_ids,1),0)>30
  THEN RAISE EXCEPTION 'invalid_group'; END IF;
  IF p_student_ids IS NOT NULL AND array_length(p_student_ids,1)>0 THEN
    SELECT count(DISTINCT z.id) INTO v_requested FROM unnest(p_student_ids) z(id);
    SELECT count(DISTINCT s.id) INTO v_count FROM public.students s
    WHERE s.id=ANY(p_student_ids) AND s.workspace_id=p_workspace_id AND s.archived_at IS NULL;
    IF v_count <> v_requested THEN RAISE EXCEPTION 'invalid_group_members'; END IF;
  END IF;
  IF p_group_id IS NULL THEN
    INSERT INTO public.workspace_student_groups(workspace_id,name)
    VALUES(p_workspace_id,btrim(p_group_name)) RETURNING id INTO v_group;
  ELSE
    UPDATE public.workspace_student_groups SET name=btrim(p_group_name)
     WHERE id=p_group_id AND workspace_id=p_workspace_id RETURNING id INTO v_group;
    IF v_group IS NULL THEN RAISE EXCEPTION 'group_not_found'; END IF;
    DELETE FROM public.workspace_student_group_members WHERE group_id=v_group
      AND workspace_id=p_workspace_id;
  END IF;
  IF p_student_ids IS NOT NULL THEN
    INSERT INTO public.workspace_student_group_members(group_id,workspace_id,student_id)
    SELECT v_group,p_workspace_id,ids.id
    FROM (SELECT DISTINCT unnest(p_student_ids) AS id) ids;
  END IF;

 ELSIF p_action='delete_group' THEN
  DELETE FROM public.workspace_student_groups
  WHERE workspace_id=p_workspace_id AND id=p_group_id;
 END IF;

 -- Existing normalized saved-plan data remains the sole source for choices
 -- and topic identities. Include preferences and reusable groups separately.
 v_snapshot := public.demo_plan_apply(p_auth_user_id,p_member_id,p_workspace_id,
  p_school_year,'load');
 SELECT coalesce(jsonb_agg(jsonb_build_object(
  'id',g.id::text,'name',g.name,'studentIds',coalesce((
   SELECT jsonb_agg(gm.student_id::text ORDER BY s.display_name)
   FROM public.workspace_student_group_members gm
   JOIN public.students s ON s.id=gm.student_id AND s.workspace_id=gm.workspace_id
   WHERE gm.group_id=g.id AND s.archived_at IS NULL),'[]'::jsonb))
  ORDER BY g.name),'[]'::jsonb)
 INTO v_groups
 FROM public.workspace_student_groups g WHERE g.workspace_id=p_workspace_id;

 SELECT coalesce(jsonb_agg(jsonb_build_object(
   'courseId',c.source_plan_id,'studentId',cs.student_id::text,
   'priority',cs.priority,'arrangement',cs.arrangement)
   ORDER BY c.source_plan_id,cs.student_id),'[]'::jsonb)
 INTO v_preferences
 FROM public.plan_course_students cs
 JOIN public.plan_course_choices c ON c.id=cs.course_choice_id
 WHERE c.workspace_id=p_workspace_id AND c.year_plan_id=v_year;

 RETURN v_snapshot || jsonb_build_object(
  'studentGroups',v_groups,'studentPreferences',v_preferences);
END;
$function$
;

REVOKE ALL ON FUNCTION public.demo_plan_apply(uuid,text,uuid,text,text,text,text,text,uuid,boolean,boolean,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.demo_plan_apply(uuid,text,uuid,text,text,text,text,text,uuid,boolean,boolean,jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.demo_plan_manage(uuid,text,uuid,text,text,text,uuid[],uuid,boolean,text,text,uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.demo_plan_manage(uuid,text,uuid,text,text,text,uuid[],uuid,boolean,text,text,uuid,text) TO service_role;
