-- Catalog choice groups now have one member-facing parent title and guidance,
-- linked to one or more neutral choice tags. Tags link to canonical Curriculum
-- Plans. Normal plan/edition grade eligibility controls course visibility.
-- Applied to the DEVELOPMENT Supabase project on November 17, 2026.
begin;
create table public.catalog_course_choice_tags (
  release_id uuid not null,
  source_tag_id text not null,
  source_group_id text not null,
  label text not null,
  sort_order integer,
  publication_status text not null
    check (publication_status in ('Draft','Active','Retired')),
  primary key (release_id, source_tag_id),
  foreign key (release_id, source_group_id)
    references public.catalog_course_choice_groups (release_id, source_group_id),
  check (length(btrim(label)) > 0)
);
create index catalog_course_choice_tags_group_idx
  on public.catalog_course_choice_tags
  (release_id, source_group_id, sort_order, source_tag_id);
create table public.catalog_course_choice_tag_options (
  release_id uuid not null,
  source_tag_id text not null,
  source_plan_id text not null,
  primary key (release_id, source_tag_id, source_plan_id),
  foreign key (release_id, source_tag_id)
    references public.catalog_course_choice_tags (release_id, source_tag_id),
  foreign key (release_id, source_plan_id)
    references public.catalog_plans (release_id, source_plan_id)
);
create index catalog_course_choice_tag_options_plan_idx
  on public.catalog_course_choice_tag_options
  (release_id, source_plan_id, source_tag_id);
alter table public.catalog_course_choice_tags enable row level security;
alter table public.catalog_course_choice_tag_options enable row level security;
revoke all on public.catalog_course_choice_tags from public, anon, authenticated;
revoke all on public.catalog_course_choice_tag_options from public, anon, authenticated;
-- Catalog staging remains service-role only; do not introduce member-facing
-- policies until entitlements and release-routing are explicitly reviewed.
commit;
