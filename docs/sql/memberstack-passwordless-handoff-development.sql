-- DEVELOPMENT-ONLY passwordless Memberstack handoff proof.
-- This is NOT a general browser authorization surface.
-- Never grant anon/authenticated access; only Edge Functions with service_role
-- can issue, consume or link any record.
create table public.memberstack_handoff_codes (
  code_sha256 text primary key check (code_sha256 ~ '^[0-9a-f]{64}$'),
  state_sha256 text not null check (state_sha256 ~ '^[0-9a-f]{64}$'),
  pkce_challenge text not null check (pkce_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  member_id text not null check (member_id ~ '^[0-9a-f]{24}$'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  constraint handoff_short_lifetime check
    (expires_at > created_at and expires_at <= created_at + interval '90 seconds')
);
create index memberstack_handoff_member_recent
  on public.memberstack_handoff_codes (member_id, created_at desc);
create index memberstack_handoff_expiration
  on public.memberstack_handoff_codes (expires_at);

create table public.memberstack_handoff_test_accounts (
  member_id text primary key check (member_id ~ '^[0-9a-f]{24}$'),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  login_email text not null unique,
  created_at timestamptz not null default now()
);

alter table public.memberstack_handoff_codes enable row level security;
alter table public.memberstack_handoff_test_accounts enable row level security;

revoke all on public.memberstack_handoff_codes from public, anon, authenticated;
revoke all on public.memberstack_handoff_test_accounts from public, anon, authenticated;
grant select, insert, update, delete on public.memberstack_handoff_codes to service_role;
grant select, insert, update, delete on public.memberstack_handoff_test_accounts to service_role;

-- Atomic one-time consumption (zero rows => bad code/PKCE/state/expiry/replay).
-- SECURITY INVOKER, no anonymous/ordinary authenticated execute privilege.
create function public.memberstack_consume_handoff(
  p_code_sha256 text, p_state_sha256 text, p_pkce_challenge text
) returns text
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_member text;
begin
  update public.memberstack_handoff_codes
    set consumed_at = clock_timestamp()
  where code_sha256 = p_code_sha256
    and state_sha256 = p_state_sha256
    and pkce_challenge = p_pkce_challenge
    and consumed_at is null
    and expires_at > clock_timestamp()
  returning member_id into v_member;
  return v_member;
end;
$$;
revoke all on function public.memberstack_consume_handoff(text,text,text)
  from public, anon, authenticated;
grant execute on function public.memberstack_consume_handoff(text,text,text)
  to service_role;

comment on table public.memberstack_handoff_test_accounts is
  'Test-only Supabase Auth account binding; NOT a completed member authorization model.';
