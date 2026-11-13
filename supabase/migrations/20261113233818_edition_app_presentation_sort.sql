-- Add year-specific, edition-based sorting for the member Course Explorer.
-- Migration version matches the recorded development Supabase history.
-- Source Airtable Plan Sort is preserved unmodified.
begin;

alter table public.catalog_editions
  add column app_presentation_sort text;

with computed as (
  select e.release_id, e.source_edition_id,
    case when parent_plan.plan_type = 'Combined Course'
      then coalesce(
        (
          select min(child_plan.plan_sort)
          from public.catalog_edition_topics link
          join public.catalog_editions child_edition
            on child_edition.release_id = link.release_id
           and child_edition.source_edition_id = link.child_source_edition_id
          join public.catalog_plans child_plan
            on child_plan.release_id = child_edition.release_id
           and child_plan.source_plan_id = child_edition.source_plan_id
          where link.release_id = e.release_id
            and link.parent_source_edition_id = e.source_edition_id
            and exists (
              select 1
              from public.catalog_plan_subjects parent_subject
              join public.catalog_plan_subjects child_subject
                on child_subject.release_id = parent_subject.release_id
               and child_subject.source_subject_id = parent_subject.source_subject_id
              where parent_subject.release_id = parent_plan.release_id
                and parent_subject.source_plan_id = parent_plan.source_plan_id
                and child_subject.source_plan_id = child_plan.source_plan_id
            )
        ), parent_plan.plan_sort)
      else parent_plan.plan_sort
    end as derived_sort
  from public.catalog_editions e
  join public.catalog_plans parent_plan
    on parent_plan.release_id = e.release_id
   and parent_plan.source_plan_id = e.source_plan_id
)
update public.catalog_editions edition
   set app_presentation_sort = computed.derived_sort
  from computed
 where edition.release_id = computed.release_id
   and edition.source_edition_id = computed.source_edition_id;

create index catalog_editions_app_presentation_sort_idx
  on public.catalog_editions (release_id, app_presentation_sort, source_edition_id);

commit;
