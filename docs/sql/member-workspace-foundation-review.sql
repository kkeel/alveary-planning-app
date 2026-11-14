-- REVIEW DRAFT ONLY: do not execute in a hosted project or expose via Data API.
-- Memberstack identity and year/workspace authorization must be verified before
-- adding member-facing policies. Create the official migration using Supabase CLI
-- 'supabase migration new ...' after offline validation and security review.
begin;

create table public.member_identity_links (
  auth_user_id uuid primary key references auth.users(id) on delete restrict,
  memberstack_member_id text not null unique,
  verified_at timestamptz not null,
  verified_source text not null check (verified_source in ('memberstack_oidc','memberstack_server')),
  created_at timestamptz not null default now()
);

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  workspace_type text not null check (workspace_type in ('family','school')),
  display_name text not null,
  created_at timestamptz not null default now()
);

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  role text not null check (role in ('family_owner','family_adult','school_admin','teacher')),
  status text not null default 'active' check (status in ('invited','active','revoked')),
  created_at timestamptz not null default now(),
  unique (workspace_id, auth_user_id)
);
create index workspace_memberships_user_idx on public.workspace_memberships(auth_user_id, status);

create table public.workspace_year_plans (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  school_year text not null check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  catalog_release_id uuid not null,
  state text not null default 'draft' check (state in ('draft','planning','active','archived')),
  created_at timestamptz not null default now(),
  unique (workspace_id, school_year),
  unique (id, workspace_id),
  foreign key (catalog_release_id, school_year)
    references public.catalog_releases (id, school_year)
);
create index workspace_year_plans_release_idx on public.workspace_year_plans(catalog_release_id);

create table public.students (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete restrict,
  display_name text not null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  unique (id, workspace_id)
);
create index students_workspace_idx on public.students(workspace_id);

create table public.student_year_placements (
  workspace_id uuid not null,
  year_plan_id uuid not null,
  student_id uuid not null,
  grade_level integer check (grade_level between 0 and 12),
  grade_label text,
  enrollment_status text not null default 'active' check (enrollment_status in ('active','inactive','completed')),
  primary key (year_plan_id, student_id),
  foreign key (year_plan_id, workspace_id)
    references public.workspace_year_plans(id, workspace_id),
  foreign key (student_id, workspace_id)
    references public.students(id, workspace_id)
);

-- No Memberstack plan automatically grants a school teacher family access.
-- Subscription grants are separate from workspace membership.
create table public.member_entitlements (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete restrict,
  memberstack_plan_id text not null,
  workspace_type text check (workspace_type in ('family','school')),
  workspace_id uuid references public.workspaces(id) on delete restrict,
  school_year text check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  capability text not null check (capability in ('catalog','planning','alveary_plus','lessons','exams','staff_preview')),
  granted_from timestamptz not null,
  granted_until timestamptz,
  verified_at timestamptz not null,
  revoked_at timestamptz,
  check (granted_until is null or granted_until > granted_from)
);
create index member_entitlements_auth_idx on public.member_entitlements(auth_user_id, capability, school_year);

create table public.developer_preview_access (
  auth_user_id uuid primary key references auth.users(id) on delete restrict,
  enabled boolean not null default false,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  granted_by uuid references auth.users(id)
);

-- Fail-closed: no client-facing access to draft private data or PII.
-- Do not add permissive policies until server-verified identity and
-- entitlement checks are implemented, audited and adversarially tested.
alter table public.member_identity_links enable row level security;
alter table public.workspaces enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.workspace_year_plans enable row level security;
alter table public.students enable row level security;
alter table public.student_year_placements enable row level security;
alter table public.member_entitlements enable row level security;
alter table public.developer_preview_access enable row level security;

revoke all on public.member_identity_links, public.workspaces,
  public.workspace_memberships, public.workspace_year_plans,
  public.students, public.student_year_placements,
  public.member_entitlements, public.developer_preview_access
  from anon, authenticated;

commit;
