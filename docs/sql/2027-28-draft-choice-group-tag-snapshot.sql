-- Development-only 2027–28 draft catalog choice snapshot from Curriculum Planning Airtable.
-- Source: Planning Choice Groups + Planning Choice Tags (November 17, 2026).
-- Re-run only while this release is DRAFT; do not use in an approved release.
begin;
insert into public.catalog_course_choice_groups
  (release_id,source_group_id,title,guidance_message,publication_status)
values
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recTo5LLWmlstCOax','Latin: Level 2 Choices','Choose one approach for Latin Level 2.
','Active'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recaPxJPuLnr2lFb8','Science Choices','Explore the standard science disciplines and alternative studies to choose an appropriate science course for each student. Consider readiness, interests, previous studies, and any prerequisites or concurrent requirements. Review our [high school science placement guide](https://drive.google.com/file/d/1hH5tEEXGK7vnimhxzbAPOH0_5OkLvdYe/view) for more guidance.
','Active'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recimzlFGRq3EGsyE','Latin: Level 1 Choices','Choose one approach for Latin Level 1.
','Active')
on conflict (release_id,source_group_id) do update set
 title=excluded.title,guidance_message=excluded.guidance_message,
 publication_status=excluded.publication_status;
insert into public.catalog_course_choice_tags
  (release_id,source_tag_id,source_group_id,label,sort_order,publication_status)
values
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recPi3pKU2TMZ9ciN','recimzlFGRq3EGsyE','Level 1 Choice',NULL,'Active'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'reco31yBaC5yZvZNa','recTo5LLWmlstCOax','Level 2 Choice',NULL,'Active'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recoyaVfgJo7uJxf2','recaPxJPuLnr2lFb8','Standard Discipline',1,'Active'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recaPxJPuLnr2lFb8','Elective Alternative',2,'Active')
on conflict (release_id,source_tag_id) do update set
 source_group_id=excluded.source_group_id,label=excluded.label,
 sort_order=excluded.sort_order,publication_status=excluded.publication_status;
insert into public.catalog_course_choice_tag_options
  (release_id,source_tag_id,source_plan_id)
values
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recPi3pKU2TMZ9ciN','recs2njNvgo2NkizU'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recPi3pKU2TMZ9ciN','recAA0ZagzqckHCk3'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'reco31yBaC5yZvZNa','recmGIFJQS2UIsA3Y'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'reco31yBaC5yZvZNa','rec35rf1E8qxmzr8i'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recoyaVfgJo7uJxf2','recBfwwsSvSEPSnPJ'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recoyaVfgJo7uJxf2','recNaAI9aThco0Wqt'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recoyaVfgJo7uJxf2','recE07d7ZlVzVRkRt'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recHqXhNk7mVGChFc'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recvdVDJqD3RovWNT'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recPZJzQqitXcVhaU'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','rec7BQBcy9mPHy40M'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recfOwt6Ny2yzcalz'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recbDJ7OAFVM5ik9v'),
((select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft'),'recrIW5bpZaRZ50HS','recjjZWvY1yFLNNIj')
on conflict (release_id,source_tag_id,source_plan_id) do nothing;
-- Retain legacy row IDs and their historical option links without allowing
-- the old per-grade group presentations to be treated as active.
update public.catalog_course_choice_groups set publication_status='Retired'
where release_id=(select id from public.catalog_releases where school_year='2027-28' and revision=1 and lifecycle='draft')
 and source_group_id in ('recPi3pKU2TMZ9ciN','reco31yBaC5yZvZNa','recrIW5bpZaRZ50HS','recoyaVfgJo7uJxf2');
commit;
