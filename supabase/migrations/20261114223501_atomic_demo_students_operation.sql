-- Private, atomic Demo student operation.
-- All membership verification must happen first in the Edge Function.
-- This function is invoker-rights and executable ONLY by service_role.
-- One database roundtrip replaces repeated workspace upserts and student queries.
CREATE OR REPLACE FUNCTION public.demo_students_apply(
  p_auth_user_id uuid,
  p_member_id text,
  p_workspace_id uuid,
  p_school_year text,
  p_action text,
  p_student_id uuid DEFAULT NULL,
  p_display_name text DEFAULT NULL,
  p_grade_level integer DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
DECLARE
  v_link_member_id text;
  v_workspace_type text;
  v_member_role text;
  v_member_status text;
  v_release_id uuid;
  v_year_plan_id uuid;
  v_existing_student_id uuid;
  v_new_student_id uuid;
  v_count integer;
  v_students jsonb;
BEGIN
  IF current_user <> 'service_role' THEN
    RAISE EXCEPTION 'server_only';
  END IF;
  IF p_auth_user_id IS NULL OR p_workspace_id IS NULL
      OR p_member_id !~ '^[0-9a-f]{24}$'
      OR p_school_year <> '2027-28'
      OR p_action NOT IN ('list','add','update','archive') THEN
    RAISE EXCEPTION 'invalid_request';
  END IF;

  INSERT INTO public.member_identity_links
    (auth_user_id, memberstack_member_id, verified_at, verified_source)
  VALUES (p_auth_user_id, p_member_id, now(), 'memberstack_oidc')
  ON CONFLICT DO NOTHING;
  SELECT memberstack_member_id INTO v_link_member_id
    FROM public.member_identity_links WHERE auth_user_id = p_auth_user_id;
  IF v_link_member_id IS DISTINCT FROM p_member_id THEN
    RAISE EXCEPTION 'identity_mismatch';
  END IF;

  INSERT INTO public.workspaces (id, workspace_type, display_name)
  VALUES (p_workspace_id, 'family', 'My Family')
  ON CONFLICT (id) DO NOTHING;
  SELECT workspace_type INTO v_workspace_type
    FROM public.workspaces WHERE id = p_workspace_id;
  IF v_workspace_type IS DISTINCT FROM 'family' THEN
    RAISE EXCEPTION 'workspace_mismatch';
  END IF;

  INSERT INTO public.workspace_memberships
    (workspace_id, auth_user_id, role, status)
  VALUES (p_workspace_id, p_auth_user_id, 'family_owner', 'active')
  ON CONFLICT (workspace_id, auth_user_id) DO NOTHING;
  SELECT role, status INTO v_member_role, v_member_status
    FROM public.workspace_memberships
    WHERE workspace_id = p_workspace_id AND auth_user_id = p_auth_user_id;
  IF v_member_role IS DISTINCT FROM 'family_owner'
      OR v_member_status IS DISTINCT FROM 'active' THEN
    RAISE EXCEPTION 'workspace_access_denied';
  END IF;

  SELECT id INTO v_release_id FROM public.catalog_releases
  WHERE school_year = p_school_year ORDER BY revision DESC LIMIT 1;
  IF v_release_id IS NULL THEN RAISE EXCEPTION 'catalog_release_missing'; END IF;

  INSERT INTO public.workspace_year_plans
    (workspace_id, school_year, catalog_release_id, plan_kind, state)
  VALUES (p_workspace_id, p_school_year, v_release_id, 'demo', 'draft')
  ON CONFLICT (workspace_id, school_year, plan_kind) DO NOTHING;
  SELECT id INTO v_year_plan_id FROM public.workspace_year_plans
  WHERE workspace_id = p_workspace_id AND school_year = p_school_year
    AND plan_kind = 'demo';
  IF v_year_plan_id IS NULL THEN RAISE EXCEPTION 'demo_year_plan_missing'; END IF;

  IF p_action = 'add' OR p_action = 'update' THEN
    IF p_display_name IS NULL
        OR length(btrim(p_display_name)) < 1
        OR length(btrim(p_display_name)) > 60
        OR p_display_name ~ '[[:cntrl:]]'
        OR (p_grade_level IS NOT NULL AND (p_grade_level < 0 OR p_grade_level > 12)) THEN
      RAISE EXCEPTION 'invalid_student';
    END IF;
  END IF;

  IF p_action = 'add' THEN
    SELECT count(*) INTO v_count FROM public.students
    WHERE workspace_id = p_workspace_id AND archived_at IS NULL;
    IF v_count >= 30 THEN RAISE EXCEPTION 'student_limit'; END IF;
    INSERT INTO public.students (workspace_id, display_name)
    VALUES (p_workspace_id, btrim(p_display_name))
    RETURNING id INTO v_new_student_id;
    INSERT INTO public.student_year_placements
      (workspace_id, year_plan_id, student_id, grade_level, grade_label, enrollment_status)
    VALUES (p_workspace_id, v_year_plan_id, v_new_student_id, p_grade_level,
      CASE WHEN p_grade_level IS NULL THEN NULL
           WHEN p_grade_level = 0 THEN 'Kindergarten'
           ELSE 'Grade ' || p_grade_level::text END, 'active');

  ELSIF p_action = 'update' OR p_action = 'archive' THEN
    SELECT id INTO v_existing_student_id FROM public.students
    WHERE id = p_student_id AND workspace_id = p_workspace_id
      AND archived_at IS NULL;
    IF v_existing_student_id IS NULL THEN RAISE EXCEPTION 'student_not_found'; END IF;

    IF p_action = 'archive' THEN
      UPDATE public.students SET archived_at = now()
      WHERE id = v_existing_student_id AND workspace_id = p_workspace_id;
      UPDATE public.student_year_placements SET enrollment_status = 'inactive'
      WHERE student_id = v_existing_student_id AND year_plan_id = v_year_plan_id
        AND workspace_id = p_workspace_id;
    ELSE
      UPDATE public.students SET display_name = btrim(p_display_name)
      WHERE id = v_existing_student_id AND workspace_id = p_workspace_id;
      INSERT INTO public.student_year_placements
        (workspace_id, year_plan_id, student_id, grade_level, grade_label, enrollment_status)
      VALUES (p_workspace_id, v_year_plan_id, v_existing_student_id, p_grade_level,
        CASE WHEN p_grade_level IS NULL THEN NULL
             WHEN p_grade_level = 0 THEN 'Kindergarten'
             ELSE 'Grade ' || p_grade_level::text END, 'active')
      ON CONFLICT (year_plan_id, student_id) DO UPDATE
        SET grade_level = EXCLUDED.grade_level, grade_label = EXCLUDED.grade_label,
            enrollment_status = EXCLUDED.enrollment_status;
    END IF;
  END IF;

  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object('id',s.id::text,'displayName',s.display_name,
                         'gradeLevel',p.grade_level)
      ORDER BY s.created_at, s.id
    ), '[]'::jsonb)
  INTO v_students
  FROM public.students AS s
  LEFT JOIN public.student_year_placements AS p
    ON p.student_id = s.id AND p.workspace_id = p_workspace_id
    AND p.year_plan_id = v_year_plan_id
  WHERE s.workspace_id = p_workspace_id AND s.archived_at IS NULL;

  RETURN jsonb_build_object('schoolYear',p_school_year,'planKind','demo',
                            'students',v_students);
END;
$function$;

REVOKE ALL ON FUNCTION public.demo_students_apply(
  uuid,text,uuid,text,text,uuid,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.demo_students_apply(
  uuid,text,uuid,text,text,uuid,text,integer) TO service_role;
