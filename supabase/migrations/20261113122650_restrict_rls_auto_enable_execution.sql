-- Keep the existing RLS-on-create event trigger, but remove public RPC access.
-- Applied and verified in Alveary Planning - Development on 2026-11-13.
-- Supabase recorded this migration as 20261113122650.
begin;

revoke execute on function public.rls_auto_enable() from public;
revoke execute on function public.rls_auto_enable() from anon, authenticated;

commit;
