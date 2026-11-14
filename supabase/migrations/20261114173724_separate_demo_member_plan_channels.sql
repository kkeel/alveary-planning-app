-- Demo is a separate plan identity and never represents a school year.
alter table public.workspace_year_plans
  add column plan_kind text not null default 'member'
  check (plan_kind in ('member', 'demo'));
alter table public.workspace_year_plans
  drop constraint workspace_year_plans_workspace_id_school_year_key;
alter table public.workspace_year_plans
  add constraint workspace_year_plans_workspace_year_kind_key
  unique (workspace_id, school_year, plan_kind);

-- Trusted administrative configuration of Memberstack subscription mapping.
create table public.memberstack_plan_access_rules (
  id uuid primary key default gen_random_uuid(),
  memberstack_plan_id text not null,
  plan_kind text not null check (plan_kind in ('demo','member')),
  school_year text check (school_year ~ '^[0-9]{4}-[0-9]{2}$'),
  workspace_type text check (workspace_type in ('family','school')),
  capability text not null check (capability in ('catalog','planning','alveary_plus','lessons','exams')),
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  unique (memberstack_plan_id, plan_kind, school_year, workspace_type, capability),
  check ((plan_kind='demo') or (plan_kind='member' and school_year is not null))
);
alter table public.memberstack_plan_access_rules enable row level security;
revoke all on public.memberstack_plan_access_rules from anon, authenticated;
-- No client policies; live Memberstack verified plan sync is still required.
