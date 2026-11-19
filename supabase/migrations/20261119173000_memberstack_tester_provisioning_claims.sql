-- Restrict concurrent first-visit account provisioning for the 2027-28
-- Testing Plan. This is a PILOT-ONLY staging structure, not a production
-- identity provider. The Memberstack member ID is the unique principal.
-- IMPORTANT: NEVER automatically delete/expire an abandoned claim. Once
-- Supabase Auth account creation has begun, a timed claim takeover could
-- orphan a user and create a second Auth identity for the same member.
-- Failed claims require audited operator reconciliation before retry.
create table public.memberstack_tester_provisioning_claims (
  member_id text primary key check (member_id ~ '^[0-9a-f]{24}$'),
  claim_sha256 text not null check (claim_sha256 ~ '^[0-9a-f]{64}$'),
  auth_user_id uuid unique references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.memberstack_tester_provisioning_claims enable row level security;
revoke all on public.memberstack_tester_provisioning_claims from public, anon, authenticated;
grant select, insert, update on public.memberstack_tester_provisioning_claims to service_role;

comment on table public.memberstack_tester_provisioning_claims is
  'Service-only permanent first-claim marker for test Auth creation. Never auto-reclaim abandoned claims: audit before any retry.';

-- No public API, no SECURITY DEFINER functions, no automatic member access.
