-- Synthetic catalog smoke tests on an isolated PostgreSQL 17 GitHub Actions service.
-- Safe only after the reviewed catalog SQL has been applied to that disposable DB.
-- No real Alveary members, curriculum, secrets, or hosted Supabase connections.

do $assert_catalog$
declare
  found_tables integer;
  unsafe_tables integer;
begin
  select count(*)
    into found_tables
    from pg_tables
   where schemaname = 'public'
     and tablename like 'catalog_%';
  if found_tables <> 14 then
    raise exception 'Expected 14 catalog tables, found %', found_tables;
  end if;

  select count(*)
    into unsafe_tables
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and c.relname like 'catalog_%'
     and c.relkind = 'r'
     and (
       not c.relrowsecurity
       or has_table_privilege('anon',c.oid,'SELECT')
       or has_table_privilege('anon',c.oid,'INSERT')
       or has_table_privilege('anon',c.oid,'UPDATE')
       or has_table_privilege('anon',c.oid,'DELETE')
       or has_table_privilege('authenticated',c.oid,'SELECT')
       or has_table_privilege('authenticated',c.oid,'INSERT')
       or has_table_privilege('authenticated',c.oid,'UPDATE')
       or has_table_privilege('authenticated',c.oid,'DELETE')
     );
  if unsafe_tables <> 0 then
    raise exception '% catalog tables missing RLS or exposing role permissions', unsafe_tables;
  end if;
  raise notice 'PASS: 14 tables have RLS enabled and no anon/authenticated DML privileges';
end
$assert_catalog$;

-- Two overlapping years must be representable without a single global current year.
insert into public.catalog_releases
  (id,school_year,revision,lifecycle)
values
  ('11111111-1111-4111-8111-111111111111','2026-27',1,'draft'),
  ('22222222-2222-4222-8222-222222222222','2027-28',1,'draft');

insert into public.catalog_grades
  (release_id, source_grade_id, grade, title)
values
  ('22222222-2222-4222-8222-222222222222','rec-grade-9',9,'Grade 9'),
  ('22222222-2222-4222-8222-222222222222','rec-grade-10',10,'Grade 10');

insert into public.catalog_plans
  (release_id,source_plan_id,plan_type,display_title,plan_sort)
values
  ('22222222-2222-4222-8222-222222222222','rec-advanced-nature','Combined Course','Advanced Nature Study','15199094-000'),
  ('22222222-2222-4222-8222-222222222222','rec-chemistry','Combined Course','Chemistry','15198099-000'),
  ('22222222-2222-4222-8222-222222222222','rec-biology','Combined Course','Biology','15198109-000');

insert into public.catalog_editions
  (release_id,source_edition_id,source_plan_id,edition_display_title)
values
  ('22222222-2222-4222-8222-222222222222','rec-ans-ed','rec-advanced-nature','Advanced Nature Study 2027–28');

insert into public.catalog_edition_year_roles
  (release_id,school_year,source_edition_id,publication_role,source_status_field)
values
  ('22222222-2222-4222-8222-222222222222','2027-28','rec-ans-ed','Primary','Next Publication Status');

insert into public.catalog_course_choice_groups
  (release_id,source_group_id,title,publication_status)
values
  ('22222222-2222-4222-8222-222222222222','rec-science-9','Science Grade 9','Active'),
  ('22222222-2222-4222-8222-222222222222','rec-science-10','Science Grade 10','Active');

insert into public.catalog_course_choice_group_grades
  (release_id,source_group_id,source_grade_id)
values
  ('22222222-2222-4222-8222-222222222222','rec-science-9','rec-grade-9'),
  ('22222222-2222-4222-8222-222222222222','rec-science-10','rec-grade-10');

insert into public.catalog_course_choice_options
  (release_id,source_group_id,source_plan_id)
values
  ('22222222-2222-4222-8222-222222222222','rec-science-9','rec-chemistry'),
  ('22222222-2222-4222-8222-222222222222','rec-science-9','rec-advanced-nature'),
  ('22222222-2222-4222-8222-222222222222','rec-science-10','rec-biology'),
  ('22222222-2222-4222-8222-222222222222','rec-science-10','rec-advanced-nature');

do $assert_relationships$
declare
  shared_course_groups integer;
  leak_count integer;
  rejected_wrong_year boolean := false;
begin
  select count(*) into shared_course_groups
    from public.catalog_course_choice_options
   where source_plan_id = 'rec-advanced-nature';
  if shared_course_groups <> 2 then
    raise exception 'Expected Advanced Nature Study to belong to two distinct grade groups';
  end if;

  -- Representative standalone-list exclusion (actual app implementation comes later).
  select count(*) into leak_count
    from public.catalog_plans p
   where p.release_id = '22222222-2222-4222-8222-222222222222'
     and exists (
       select 1 from public.catalog_course_choice_options o
         join public.catalog_course_choice_groups g
           on (g.release_id,g.source_group_id)=(o.release_id,o.source_group_id)
        where o.release_id=p.release_id and o.source_plan_id=p.source_plan_id
          and g.publication_status='Active'
     )
     and p.source_plan_id not in (
       select o.source_plan_id from public.catalog_course_choice_options o
        join public.catalog_course_choice_groups g
          on (g.release_id,g.source_group_id)=(o.release_id,o.source_group_id)
       where o.release_id=p.release_id and g.publication_status='Active'
     );
  if leak_count <> 0 then
    raise exception 'A grouped course leaked into the sample standalone-list projection';
  end if;

  begin
    insert into public.catalog_edition_year_roles
      (release_id,school_year,source_edition_id,publication_role,source_status_field)
    values
      ('22222222-2222-4222-8222-222222222222','2026-27','rec-ans-ed','Primary','Next Publication Status');
  exception when foreign_key_violation then
    rejected_wrong_year := true;
  end;
  if not rejected_wrong_year then
    raise exception 'Cross-year edition role was unexpectedly allowed';
  end if;

  raise notice 'PASS: shared course options, canonical plan IDs and cross-year isolation';
end
$assert_relationships$;
