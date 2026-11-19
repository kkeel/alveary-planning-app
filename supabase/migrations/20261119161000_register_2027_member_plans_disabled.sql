-- Register 2027-28 membership tiers without granting new planning access.
-- These mappings remain DISABLED until the Memberstack-ID-based provisioning,
-- authorization and school workspace flows have been tested and approved.
-- Existing 2027-28 Testing Plan permission is deliberately unchanged.
--
-- Never treat this configuration as the only authorization check: the private
-- API must verify the signed Memberstack identity AND current ACTIVE plan
-- with the Memberstack server on each required authorization boundary.

insert into public.memberstack_plan_access_rules
  (memberstack_plan_id, plan_kind, school_year, workspace_type, capability, enabled)
values
  ('pln_alveary-membership-2027-2028-1a3g0ppr', 'member', '2027-28', 'family', 'planning', false),
  ('pln_alveary-membership-2027-2028--hh6l0f3n', 'member', '2027-28', 'family', 'planning', false),
  ('pln_alveary-school-license-2027-2028--kt6m0fpm', 'member', '2027-28', 'school', 'planning', false)
on conflict (memberstack_plan_id, plan_kind, school_year, workspace_type, capability)
do nothing;

-- Fail closed if this migration is applied to a database where these plan
-- mappings were previously enabled. Do not silently revoke approved grants:
-- detect them and require an explicit reviewed production configuration change.
do $$
begin
  if exists (
    select 1
      from public.memberstack_plan_access_rules
     where memberstack_plan_id in (
       'pln_alveary-membership-2027-2028-1a3g0ppr',
       'pln_alveary-membership-2027-2028--hh6l0f3n',
       'pln_alveary-school-license-2027-2028--kt6m0fpm'
     )
       and plan_kind = 'member'
       and school_year = '2027-28'
       and capability = 'planning'
       and enabled
  ) then
    raise exception 'Launch plan already enabled; review before applying staged rules';
  end if;
end $$;
