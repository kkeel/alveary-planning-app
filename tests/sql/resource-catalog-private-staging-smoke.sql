-- Live-development staging smoke test. Run as a database administrator;
-- tests should fail if a partial import, a cross-release link, or a direct
-- browser access grant is accidentally introduced.
do $checks$
declare
  n integer;
  table_name text;
begin
  select count(*) into n from public.catalog_resources;
  if n <> 345 then raise exception 'Expected 345 staged resources, found %', n; end if;

  select count(*) into n from public.catalog_resource_assignments;
  if n <> 447 then raise exception 'Expected 447 staged assignments, found %', n; end if;

  select count(*) into n from public.catalog_resource_assignment_items;
  if n <> 483 then raise exception 'Expected 483 assignment items, found %', n; end if;

  select count(*) into n from public.catalog_resource_links;
  if n <> 549 then raise exception 'Expected 549 validated HTTPS links, found %', n; end if;

  select count(*) into n from public.catalog_resources where member_only;
  if n <> 43 then raise exception 'Expected 43 member-only resources, found %', n; end if;

  select count(*) into n from public.catalog_resource_links where member_only;
  if n <> 38 then raise exception 'Expected 38 member-only individual links, found %', n; end if;

  select count(*) into n from public.catalog_resource_assignments where choose_one;
  if n <> 19 then raise exception 'Expected 19 advisory choice assignment groups, found %', n; end if;

  if exists (
    select 1 from public.catalog_resource_links where link_url !~ '^https://'
  ) then raise exception 'Non-HTTPS link reached staging'; end if;

  if exists (
    select 1 from public.catalog_resource_assignment_items item
    left join public.catalog_resources resource
      on resource.release_id=item.release_id
      and resource.source_resource_id=item.source_resource_id
    left join public.catalog_resource_assignments assignment
      on assignment.release_id=item.release_id
      and assignment.source_assignment_id=item.source_assignment_id
    where resource.source_resource_id is null or assignment.source_assignment_id is null
  ) then raise exception 'Orphaned assignment item'; end if;

  foreach table_name in array array[
    'catalog_resources', 'catalog_resource_assignments',
    'catalog_resource_assignment_items', 'catalog_resource_links'
  ] loop
    if not exists (
      select 1 from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
      where ns.nspname='public' and c.relname=table_name and c.relrowsecurity=true
    ) then raise exception 'RLS not enabled on %', table_name; end if;

    if has_table_privilege('anon', 'public.' || table_name, 'SELECT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'SELECT')
      or has_table_privilege('anon', 'public.' || table_name, 'INSERT')
      or has_table_privilege('authenticated', 'public.' || table_name, 'UPDATE')
    then raise exception 'Direct browser privileges found on %', table_name; end if;

    if exists (
      select 1 from pg_policies
      where schemaname='public' and tablename=table_name
    ) then raise exception 'Unexpected catalog staging policy on %', table_name; end if;
  end loop;
end
$checks$;
