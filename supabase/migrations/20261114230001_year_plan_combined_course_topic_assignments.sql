-- Applied to development Supabase as 20261114230001.
-- A combined course remains a single planning choice, with explicit linked
-- topic-edition units and derived per-student assignments.
CREATE TABLE public.plan_course_choices (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 workspace_id uuid NOT NULL,
 year_plan_id uuid NOT NULL,
 catalog_release_id uuid NOT NULL,
 source_plan_id text NOT NULL,
 stage text NOT NULL DEFAULT 'idea' CHECK (stage IN ('idea','planned')),
 display_order integer NOT NULL DEFAULT 0,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (year_plan_id, source_plan_id),
 UNIQUE (id, workspace_id),
 UNIQUE (id, catalog_release_id),
 FOREIGN KEY (year_plan_id,workspace_id) REFERENCES public.workspace_year_plans(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY (catalog_release_id,source_plan_id) REFERENCES public.catalog_plans(release_id,source_plan_id)
);
CREATE INDEX plan_course_choices_year_stage_order ON public.plan_course_choices(year_plan_id,stage,display_order);

CREATE TABLE public.plan_course_topics (
 course_choice_id uuid NOT NULL,
 catalog_release_id uuid NOT NULL,
 topic_source_edition_id text NOT NULL,
 included boolean NOT NULL DEFAULT true,
 topic_order integer NOT NULL DEFAULT 0,
 PRIMARY KEY (course_choice_id,topic_source_edition_id),
 FOREIGN KEY (course_choice_id,catalog_release_id)
  REFERENCES public.plan_course_choices(id,catalog_release_id) ON DELETE CASCADE,
 FOREIGN KEY (catalog_release_id,topic_source_edition_id)
  REFERENCES public.catalog_editions(release_id,source_edition_id)
);
CREATE INDEX plan_course_topics_included ON public.plan_course_topics(course_choice_id,included);

CREATE TABLE public.plan_course_students (
 course_choice_id uuid NOT NULL,
 workspace_id uuid NOT NULL,
 student_id uuid NOT NULL,
 assigned_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (course_choice_id,student_id),
 FOREIGN KEY (course_choice_id,workspace_id)
  REFERENCES public.plan_course_choices(id,workspace_id) ON DELETE CASCADE,
 FOREIGN KEY (student_id,workspace_id)
  REFERENCES public.students(id,workspace_id)
);
CREATE INDEX plan_course_students_student ON public.plan_course_students(student_id);

CREATE TABLE public.plan_topic_student_overrides (
 course_choice_id uuid NOT NULL,
 catalog_release_id uuid NOT NULL,
 topic_source_edition_id text NOT NULL,
 workspace_id uuid NOT NULL,
 student_id uuid NOT NULL,
 assigned boolean NOT NULL,
 PRIMARY KEY (course_choice_id,topic_source_edition_id,student_id),
 FOREIGN KEY (course_choice_id,topic_source_edition_id)
  REFERENCES public.plan_course_topics(course_choice_id,topic_source_edition_id) ON DELETE CASCADE,
 FOREIGN KEY (course_choice_id,catalog_release_id)
  REFERENCES public.plan_course_choices(id,catalog_release_id) ON DELETE CASCADE,
 FOREIGN KEY (student_id,workspace_id)
  REFERENCES public.students(id,workspace_id)
);
CREATE INDEX plan_topic_student_overrides_student ON public.plan_topic_student_overrides(student_id);

ALTER TABLE public.plan_course_choices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_course_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_course_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plan_topic_student_overrides ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.plan_course_choices,public.plan_course_topics,
 public.plan_course_students,public.plan_topic_student_overrides FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.plan_course_choices,public.plan_course_topics,
 public.plan_course_students,public.plan_topic_student_overrides TO service_role;
GRANT SELECT ON public.catalog_plans,public.catalog_editions,public.catalog_edition_topics TO service_role;

-- Consumer contract for scheduling, single-topic PDF exports and Syllabird:
-- preserve the originating course choice and independent topic-edition IDs.
CREATE VIEW public.plan_effective_student_topics WITH (security_invoker=true) AS
SELECT c.workspace_id,c.year_plan_id,c.id AS course_choice_id,
 c.source_plan_id AS parent_source_plan_id,
 t.topic_source_edition_id AS topic_source_edition_id,
 e.source_plan_id AS topic_source_plan_id,
 sp.student_id,c.catalog_release_id,c.stage,t.topic_order
FROM public.plan_course_choices c
JOIN public.plan_course_topics t ON t.course_choice_id=c.id AND t.included
JOIN public.catalog_editions e
 ON e.release_id=c.catalog_release_id AND e.source_edition_id=t.topic_source_edition_id
JOIN public.student_year_placements sp
 ON sp.year_plan_id=c.year_plan_id AND sp.workspace_id=c.workspace_id
 AND sp.enrollment_status='active'
LEFT JOIN public.plan_course_students g
 ON g.course_choice_id=c.id AND g.student_id=sp.student_id
LEFT JOIN public.plan_topic_student_overrides o
 ON o.course_choice_id=c.id AND o.topic_source_edition_id=t.topic_source_edition_id
 AND o.student_id=sp.student_id
WHERE c.stage='planned' AND COALESCE(o.assigned,g.student_id IS NOT NULL);
REVOKE ALL ON public.plan_effective_student_topics FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.plan_effective_student_topics TO service_role;
