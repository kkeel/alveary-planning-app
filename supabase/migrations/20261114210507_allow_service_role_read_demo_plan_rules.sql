-- The memberstack-plan-access Edge Function uses Supabase's server-only secret key.
-- It must be able to read enabled yearly plan mappings through PostgREST.
-- Explicitly grant SELECT only to service_role; do not grant to anon/authenticated.
-- Keep RLS enabled and no public policies.
GRANT SELECT ON TABLE public.memberstack_plan_access_rules TO service_role;
