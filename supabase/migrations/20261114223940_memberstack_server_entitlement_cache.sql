-- Short-lived, server-verified Memberstack entitlement cache.
-- The JWT authentication session is independent from entitlement freshness.
CREATE TABLE IF NOT EXISTS public.memberstack_entitlement_cache (
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  memberstack_member_id text NOT NULL,
  memberstack_plan_id text NOT NULL,
  school_year text NOT NULL,
  plan_kind text NOT NULL,
  workspace_type text NOT NULL,
  capability text NOT NULL,
  verified_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  invalidated_at timestamptz,
  CONSTRAINT memberstack_entitlement_cache_pkey PRIMARY KEY
    (auth_user_id,school_year,plan_kind,workspace_type,capability),
  CONSTRAINT memberstack_entitlement_cache_time_valid CHECK
    (expires_at > verified_at AND expires_at <= verified_at + INTERVAL '5 minutes')
);
ALTER TABLE public.memberstack_entitlement_cache ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.memberstack_entitlement_cache FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.memberstack_entitlement_cache TO service_role;

-- Current access rules join the cache so disabling a plan mapping takes
-- effect even when the last verification time is still within the TTL.
CREATE OR REPLACE FUNCTION public.memberstack_cached_demo_access(
 p_auth_user_id uuid,p_memberstack_member_id text,p_school_year text,
 p_plan_kind text,p_workspace_type text,p_capability text
) RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$
 SELECT EXISTS(
   SELECT 1 FROM public.memberstack_entitlement_cache c
   JOIN public.memberstack_plan_access_rules r
     ON r.memberstack_plan_id=c.memberstack_plan_id
   WHERE c.auth_user_id=p_auth_user_id
     AND c.memberstack_member_id=p_memberstack_member_id
     AND c.school_year=p_school_year AND c.plan_kind=p_plan_kind
     AND c.workspace_type=p_workspace_type AND c.capability=p_capability
     AND c.verified_at<=now() AND c.expires_at>now()
     AND c.invalidated_at IS NULL AND r.enabled IS TRUE
     AND r.school_year=c.school_year AND r.plan_kind=c.plan_kind
     AND r.workspace_type=c.workspace_type AND r.capability=c.capability
 )
$$;
REVOKE ALL ON FUNCTION public.memberstack_cached_demo_access(
 uuid,text,text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.memberstack_cached_demo_access(
 uuid,text,text,text,text,text) TO service_role;
