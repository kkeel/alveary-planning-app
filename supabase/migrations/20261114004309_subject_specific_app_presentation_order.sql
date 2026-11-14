begin;

-- Subject-specific member display order for 2027-28 only.
-- Recompute the same-subject topic anchor from SOURCE plan sort on each run.
-- This is intentionally idempotent and does not modify Airtable Plan Sort.
with baseline as (
  select
    e.release_id,
    e.source_edition_id,
    p.source_plan_id,
    p.plan_type,
    p.plan_sort,
    p.display_title,
    p.country_scope,
    (
      select s.title
      from public.catalog_plan_subjects ps
      join public.catalog_subjects s
        on s.release_id=ps.release_id
       and s.source_subject_id=ps.source_subject_id
      where ps.release_id=p.release_id and ps.source_plan_id=p.source_plan_id
      order by s.subject_sort nulls last, s.title
      limit 1
    ) as subject_title,
    (
      select min(gr.grade)
      from public.catalog_plan_grades pg
      join public.catalog_grades gr
        on gr.release_id=pg.release_id
       and gr.source_grade_id=pg.source_grade_id
      where pg.release_id=p.release_id and pg.source_plan_id=p.source_plan_id
    ) as first_grade,
    case when p.plan_type='Combined Course'
      then coalesce(
        (
          select min(child.plan_sort)
          from public.catalog_edition_topics composition
          join public.catalog_editions child_edition
            on child_edition.release_id=composition.release_id
           and child_edition.source_edition_id=composition.child_source_edition_id
          join public.catalog_plans child
            on child.release_id=child_edition.release_id
           and child.source_plan_id=child_edition.source_plan_id
          where composition.release_id=e.release_id
            and composition.parent_source_edition_id=e.source_edition_id
            and exists (
              select 1
              from public.catalog_plan_subjects parent_subject
              join public.catalog_plan_subjects child_subject
                on child_subject.release_id=parent_subject.release_id
               and child_subject.source_subject_id=parent_subject.source_subject_id
              where parent_subject.release_id=p.release_id
                and parent_subject.source_plan_id=p.source_plan_id
                and child_subject.source_plan_id=child.source_plan_id
            )
        ),
        p.plan_sort
      )
      else p.plan_sort
    end as base_sort
  from public.catalog_editions e
  join public.catalog_plans p
    on p.release_id=e.release_id
   and p.source_plan_id=e.source_plan_id
  join public.catalog_releases r
    on r.id=e.release_id
   and r.school_year='2027-28'
   and r.revision=1
   and r.lifecycle='draft'
),
keys as (
  select *,
    lpad(first_grade::text,2,'0') as grade_key,
    case country_scope when 'U.S.' then '1' when 'Canada' then '2' else '0' end as country_key
  from baseline
)
update public.catalog_editions target
set app_presentation_sort =
  case
    -- Grade first; then U.S. before Canada, like Geography.
    -- Beginner Plutarch is an optional preparatory path, listed LAST.
    when keys.plan_type<>'Topic' and keys.subject_title='Citizenship'
         and keys.display_title='Plutarch: Beginner Track'
      then left(keys.base_sort,2) || 'Z' || keys.base_sort
    when keys.plan_type<>'Topic' and keys.subject_title in ('History','Citizenship')
      then left(keys.base_sort,2) || 'G' || keys.grade_key || 'C' || keys.country_key || '-' || keys.base_sort

    -- Grade first. RightStart, Beast Academy, regular Mathematics,
    -- then Denison within a grade. Story of ... courses follow ALL
    -- traditional math options, even when assigned to younger grades.
    when keys.plan_type<>'Topic' and keys.subject_title='Math'
         and keys.display_title like 'Story of %'
      then left(keys.base_sort,2) || 'Z' || keys.grade_key || '-' || keys.base_sort
    when keys.plan_type<>'Topic' and keys.subject_title='Math'
      then left(keys.base_sort,2) || 'G' || keys.grade_key || 'P' ||
        case
          when keys.display_title like 'RightStart Math:%' then '10'
          when keys.display_title like 'Beast Academy Math:%' then '20'
          when keys.display_title like 'Mathematics:%' then '25'
          when keys.display_title like 'Denison%' then '30'
          else '40'
        end || '-' || keys.base_sort

    -- Every Spanish level comes before EVERY French level.
    -- Within a language the lower level precedes upper levels.
    when keys.plan_type<>'Topic' and keys.subject_title='Modern Language'
      then left(keys.base_sort,2) || 'L' ||
        case
          when keys.display_title like '%Spanish%' then '1'
          when keys.display_title like '%French%' then '2'
          else '9'
        end || 'G' || keys.grade_key || '-' || keys.base_sort

    -- Existing Shakespeare beginner-first and every other subject
    -- retain the same-subject topic-anchored sort.
    else keys.base_sort
  end
from keys
where target.release_id=keys.release_id
  and target.source_edition_id=keys.source_edition_id;

commit;
