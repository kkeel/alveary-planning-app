-- Verification query (read-only): this migration should remove direct RPC execute
-- while leaving the database's ensure_rls DDL event trigger active.
select
  has_function_privilege('anon', 'public.rls_auto_enable()', 'EXECUTE') as anon_can_execute,
  has_function_privilege('authenticated', 'public.rls_auto_enable()', 'EXECUTE') as signed_in_can_execute,
  (select evtenabled from pg_event_trigger where evtname = 'ensure_rls') as event_trigger_enabled;
