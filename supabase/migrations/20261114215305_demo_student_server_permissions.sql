-- Private Demo family workspace and student CRUD, server-side only.
-- No anon or authenticated browser roles receive grants or policies.
GRANT SELECT, INSERT ON public.member_identity_links TO service_role;
GRANT SELECT, INSERT ON public.workspaces TO service_role;
GRANT SELECT, INSERT ON public.workspace_memberships TO service_role;
GRANT SELECT, INSERT ON public.workspace_year_plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.students TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.student_year_placements TO service_role;
GRANT SELECT ON public.catalog_releases TO service_role;
