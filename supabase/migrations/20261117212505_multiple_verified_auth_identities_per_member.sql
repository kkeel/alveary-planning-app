-- One Memberstack family may use multiple independently verified Supabase Auth
-- identities: Custom OIDC and the website-issued passwordless handoff account.
-- The primary key on auth_user_id still prevents a user changing families.
-- All linking writes are restricted to service_role after server verification.
alter table public.member_identity_links
  drop constraint member_identity_links_memberstack_member_id_key;

create index if not exists member_identity_links_by_memberstack_member
  on public.member_identity_links (memberstack_member_id);

comment on table public.member_identity_links is
  'Server-verified many-auth-identities-to-one-Memberstack-member links. '
  'Existing OIDC links use memberstack_oidc; website handoff links use memberstack_server. '
  'Browser callers cannot supply trusted links or workspace ownership.';

-- Keep all existing RLS and table grants unchanged. No direct browser access.
