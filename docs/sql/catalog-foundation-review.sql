-- REVIEW-ONLY SQL: first Alveary 2027–28 catalog foundation.
-- This is NOT a migration file and must NOT be applied directly.
-- After review, use "supabase migration new ..." in the installed CLI
-- to generate a version-controlled migration file and place the reviewed SQL there.
-- No user data, lesson packet URLs, or Airtable source data belong in this script.
--
-- Every table is closed to anon/authenticated from day one.
-- Future read policies and year-entitlement checks require separate review.

begin;

create table public.catalog_releases (
  id uuid primary key default gen_random_uuid(),
  school_year text not null
    check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  revision integer not null check (revision > 0),
  lifecycle text not null default 'draft'
    check (lifecycle in ('draft', 'validated', 'approved', 'archived')),
  source_revision text,
  source_checksum text,
  validation_report jsonb,
  created_at timestamptz not null default now(),
  validated_at timestamptz,
  approved_at timestamptz,
  approved_by text,
  unique (school_year, revision),
  unique (id, school_year),
  check (lifecycle <> 'approved' or approved_at is not null)
);

-- A school year can have multiple simultaneous routes, e.g. 2026–27
-- existing lessons while 2027–28 course planning is accessible.
-- These routes are metadata ONLY; a later migration will define carefully
-- reviewed member entitlement checks and actual API read access.
create table public.catalog_release_routes (
  school_year text not null
    check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  surface text not null
    check (surface in ('courses','books','scheduling','supplies','lessons','exams')),
  audience text not null
    check (audience in ('developer','member','public')),
  release_id uuid not null,
  status text not null default 'disabled'
    check (status in ('disabled','active','retired')),
  available_from timestamptz,
  available_until timestamptz,
  approved_at timestamptz,
  approved_by text,
  legacy_destination text,
  updated_at timestamptz not null default now(),
  primary key (school_year, surface, audience),
  foreign key (release_id, school_year)
    references public.catalog_releases (id, school_year),
  check (available_until is null or available_from is null
         or available_until > available_from),
  check (status <> 'active' or approved_at is not null)
);

create table public.catalog_subjects (
  release_id uuid not null references public.catalog_releases(id),
  source_subject_id text not null,
  title text not null,
  subject_sort integer,
  primary key (release_id, source_subject_id)
);

create table public.catalog_grades (
  release_id uuid not null references public.catalog_releases(id),
  source_grade_id text not null,
  grade integer not null check (grade between 0 and 12),
  title text not null,
  suggested_morning_minutes integer
    check (suggested_morning_minutes is null or suggested_morning_minutes >= 0),
  primary key (release_id, source_grade_id),
  unique (release_id, grade)
);

create table public.catalog_plans (
  release_id uuid not null references public.catalog_releases(id),
  source_plan_id text not null,
  plan_type text not null
    check (plan_type in ('Topic','Single-Topic Course','Combined Course')),
  display_title text not null,
  plan_sort text, -- preserve Airtable text verbatim; never coerce to integer
  plan_status text,
  country_scope text,
  cycle_label text,
  course_list_description text,
  combining_and_placement_tips text,
  primary key (release_id, source_plan_id)
);

create index catalog_plans_sort_idx
  on public.catalog_plans (release_id, plan_sort, source_plan_id);
create index catalog_plans_type_idx
  on public.catalog_plans (release_id, plan_type);

-- Links are explicit. A curriculum plan may cover several grades, rotations,
-- or subjects; none of these relations implies a choice-group display grade.
create table public.catalog_plan_subjects (
  release_id uuid not null,
  source_plan_id text not null,
  source_subject_id text not null,
  primary key (release_id, source_plan_id, source_subject_id),
  foreign key (release_id, source_plan_id)
    references public.catalog_plans (release_id, source_plan_id),
  foreign key (release_id, source_subject_id)
    references public.catalog_subjects (release_id, source_subject_id)
);

create table public.catalog_plan_grades (
  release_id uuid not null,
  source_plan_id text not null,
  source_grade_id text not null,
  primary key (release_id, source_plan_id, source_grade_id),
  foreign key (release_id, source_plan_id)
    references public.catalog_plans (release_id, source_plan_id),
  foreign key (release_id, source_grade_id)
    references public.catalog_grades (release_id, source_grade_id)
);

create table public.catalog_plan_rotations (
  release_id uuid not null,
  source_plan_id text not null,
  rotation text not null check (rotation in ('R1','R2','R3','R4')),
  primary key (release_id, source_plan_id, rotation),
  foreign key (release_id, source_plan_id)
    references public.catalog_plans (release_id, source_plan_id)
);

create table public.catalog_editions (
  release_id uuid not null references public.catalog_releases(id),
  source_edition_id text not null,
  source_plan_id text not null,
  edition_display_title text not null,
  writing_status text,
  edition_development_notes text,
  focus_term_1 text,
  focus_term_2 text,
  focus_term_3 text,
  primary key (release_id, source_edition_id),
  foreign key (release_id, source_plan_id)
    references public.catalog_plans (release_id, source_plan_id)
);

create index catalog_editions_plan_idx
  on public.catalog_editions (release_id, source_plan_id);

-- Snapshot a year-specific role rather than carrying one permanent global
-- Current/Next state. An edition may exist in multiple yearly releases.
create table public.catalog_edition_year_roles (
  release_id uuid not null,
  school_year text not null,
  source_edition_id text not null,
  publication_role text not null
    check (publication_role in
      ('Primary','Alternate','Reserved','Retired','Needs Assignment')),
  source_status_field text not null
    check (source_status_field in ('Current Publication Status',
                                  'Next Publication Status')),
  captured_at timestamptz not null default now(),
  primary key (release_id, school_year, source_edition_id),
  foreign key (release_id, school_year)
    references public.catalog_releases (id, school_year),
  foreign key (release_id, source_edition_id)
    references public.catalog_editions (release_id, source_edition_id)
);

-- Composite foreign keys prevent a parent edition from referencing a child
-- edition in a different snapshot. Authoritative packet interleaving order
-- will be established in a separate authoring/publishing workflow.
create table public.catalog_edition_topics (
  release_id uuid not null,
  parent_source_edition_id text not null,
  child_source_edition_id text not null,
  display_order integer check (display_order is null or display_order >= 0),
  term_number integer check (term_number is null or term_number between 1 and 3),
  sequence_confirmed boolean not null default false,
  primary key (release_id, parent_source_edition_id, child_source_edition_id),
  foreign key (release_id, parent_source_edition_id)
    references public.catalog_editions (release_id, source_edition_id),
  foreign key (release_id, child_source_edition_id)
    references public.catalog_editions (release_id, source_edition_id),
  check (parent_source_edition_id <> child_source_edition_id)
);

-- Course choice groups are strictly advisory and release-scoped.
-- The actual Airtable source is one Planning Choice Groups table with
-- multiple Curriculum Plans links; Supabase normalizes those links.
create table public.catalog_course_choice_groups (
  release_id uuid not null references public.catalog_releases(id),
  source_group_id text not null,
  title text not null,
  guidance_message text,
  publication_status text not null
    check (publication_status in ('Draft','Active','Retired')),
  primary key (release_id, source_group_id)
);

-- Explicit display-grade membership: never infer from linked plan grades
-- or from Airtable's "Grade(s)" first-linked-course lookup.
create table public.catalog_course_choice_group_grades (
  release_id uuid not null,
  source_group_id text not null,
  source_grade_id text not null,
  primary key (release_id, source_group_id, source_grade_id),
  foreign key (release_id, source_group_id)
    references public.catalog_course_choice_groups (release_id, source_group_id),
  foreign key (release_id, source_grade_id)
    references public.catalog_grades (release_id, source_grade_id)
);

create table public.catalog_course_choice_options (
  release_id uuid not null,
  source_group_id text not null,
  source_plan_id text not null,
  primary key (release_id, source_group_id, source_plan_id),
  foreign key (release_id, source_group_id)
    references public.catalog_course_choice_groups (release_id, source_group_id),
  foreign key (release_id, source_plan_id)
    references public.catalog_plans (release_id, source_plan_id)
);

-- Closed by default even on projects with old public schema privileges.
-- There are intentionally NO anon/authenticated read policies or grants.
do $lock_catalog$
declare
  catalog_table text;
begin
  foreach catalog_table in array ARRAY[
    'catalog_releases','catalog_release_routes','catalog_subjects',
    'catalog_grades','catalog_plans','catalog_plan_subjects',
    'catalog_plan_grades','catalog_plan_rotations','catalog_editions',
    'catalog_edition_year_roles','catalog_edition_topics',
    'catalog_course_choice_groups','catalog_course_choice_group_grades',
    'catalog_course_choice_options'
  ] loop
    execute format('alter table public.%I enable row level security',catalog_table);
    execute format('revoke all privileges on table public.%I from public, anon, authenticated',catalog_table);
  end loop;
end;
$lock_catalog$;

commit;
