-- Draft 2027–28 resource catalog staging. Run only in Alveary Planning
-- development, after reviewing the access rules and source inventory.
-- No public or ordinary authenticated Data API access until a separate
-- approved publication route and reviewed safe projection are implemented.
begin;

create table if not exists public.catalog_resources (
  release_id uuid not null references public.catalog_releases(id),
  source_resource_id text not null,
  title text not null,
  author_creator text,
  isbn_asin text,
  resource_type text,
  rationale text,
  notes text,
  availability_status text,
  review_status text,
  member_only boolean not null default false,
  delay_live_link boolean not null default false,
  primary key (release_id, source_resource_id),
  check (length(trim(source_resource_id)) > 0),
  check (length(trim(title)) > 0)
);

create table if not exists public.catalog_resource_assignments (
  release_id uuid not null,
  source_assignment_id text not null,
  source_edition_id text not null,
  role text,
  optional boolean not null default false,
  choose_one boolean not null default false,
  display_order integer,
  term_1_usage text,
  term_2_usage text,
  term_3_usage text,
  rationale text,
  notes text,
  primary key (release_id, source_assignment_id),
  foreign key (release_id, source_edition_id)
    references public.catalog_editions(release_id, source_edition_id),
  check (length(trim(source_assignment_id)) > 0)
);

create table if not exists public.catalog_resource_assignment_items (
  release_id uuid not null,
  source_assignment_id text not null,
  source_resource_id text not null,
  item_order integer not null,
  primary key (release_id, source_assignment_id, source_resource_id),
  unique (release_id, source_assignment_id, item_order),
  foreign key (release_id, source_assignment_id)
    references public.catalog_resource_assignments(release_id, source_assignment_id),
  foreign key (release_id, source_resource_id)
    references public.catalog_resources(release_id, source_resource_id),
  check (item_order >= 1)
);

create table if not exists public.catalog_resource_links (
  release_id uuid not null,
  source_resource_id text not null,
  link_position smallint not null,
  link_label text,
  link_url text not null,
  member_only boolean not null default false,
  primary key (release_id, source_resource_id, link_position),
  foreign key (release_id, source_resource_id)
    references public.catalog_resources(release_id, source_resource_id),
  check (link_position in (1, 2)),
  check (link_url ~ '^https://')
);

create index if not exists catalog_resource_assignments_by_edition
  on public.catalog_resource_assignments(release_id, source_edition_id, display_order);
create index if not exists catalog_resource_assignment_items_by_resource
  on public.catalog_resource_assignment_items(release_id, source_resource_id);
create index if not exists catalog_resources_by_title
  on public.catalog_resources(release_id, title);

-- Explicitly deny direct browser/API access to the entire draft snapshot.
-- This includes member-only resource metadata and restricted purchase URLs.
-- Even a signed-in user is not entitled to staging data.
alter table public.catalog_resources enable row level security;
alter table public.catalog_resource_assignments enable row level security;
alter table public.catalog_resource_assignment_items enable row level security;
alter table public.catalog_resource_links enable row level security;

revoke all on table public.catalog_resources from public, anon, authenticated;
revoke all on table public.catalog_resource_assignments from public, anon, authenticated;
revoke all on table public.catalog_resource_assignment_items from public, anon, authenticated;
revoke all on table public.catalog_resource_links from public, anon, authenticated;

grant select, insert, update, delete on table public.catalog_resources to service_role;
grant select, insert, update, delete on table public.catalog_resource_assignments to service_role;
grant select, insert, update, delete on table public.catalog_resource_assignment_items to service_role;
grant select, insert, update, delete on table public.catalog_resource_links to service_role;

commit;
