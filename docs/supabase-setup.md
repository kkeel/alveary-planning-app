# Connecting the new Alveary Planning App to Supabase

Status: **repository preparation only** (November 12, 2026). No hosted schema migration, Airtable sync, or automatic database deployment has been performed.

## Which systems are connected?

- `kkeel/alveary-planning-app` already builds a Next.js app using **public** Supabase URL and publishable-key GitHub Actions variables. That configuration supports the current login experiment but does not manage database schema.
- The existing hosted **Alveary Planning - Development** Supabase project has reference `fzitmrzuxxdmvrhftdkr`. Its `public` schema and migration list were empty at the November 12 audit.
- This PR introduces a `supabase/` directory that the optional Supabase GitHub integration can read.

## One-time GitHub integration action (account authorization required)

After this PR is merged:

1. Open [Alveary Planning - Development → Integrations](https://supabase.com/dashboard/project/fzitmrzuxxdmvrhftdkr/settings/integrations).
2. Under **GitHub Integration**, authorize GitHub as requested. Select `kkeel/alveary-planning-app`; do not select `kkeel/course-picker` or `kkeel/lesson-print-preview`.
3. Set **Working directory** to `.` because `supabase/` is at the repository root.
4. For the initial setup, leave **Deploy to production** and **Automatic branching** turned **off**. The latter may create additional billable Supabase preview environments.
5. Enable the repository integration. **Do not turn on production deployment until the first migration and access policies have been reviewed and tested.**

If the interface or available toggles differ, stop and inspect the displayed choices rather than choosing a default that deploys migrations automatically.

## Subsequent work (not completed by repository setup)

1. Agree on the full Airtable → Supabase data contract in [Curriculum publishing contract](curriculum-publishing-contract.md).
2. Create the first schema migration with the Supabase CLI, preserving that generated migration file in Git. Run SQL/security checks, verify RLS, and test publication states.
3. Build a **new** GitHub Actions publishing workflow that reads the Curriculum Planning Airtable base using repository **secrets**, validates *all* applicable records, stages a versioned Supabase release, and promotes an approved release atomically.
4. Build a verified Memberstack-based identity / yearly-entitlement adapter before allowing client access to private member rows or paid curriculum.
5. Only after verification, decide whether to enable migrations from `main` through the Supabase GitHub integration. Keep schema deployment and curriculum content publication as separate release operations.

## CLI note (November 2026)

Supabase CLI **v3** changed remote-target defaults: database commands operate locally unless given `--remote`; unattended hosted changes additionally need `--yes`. Review the [official change notice](https://supabase.com/changelog/supabase-cli-v3) before adding any CI commands, and pin the CLI version in automated workflows.

Official integration instructions: https://supabase.com/docs/guides/deployment/branching/github-integration

## Important: what this does *not* solve

- No GitHub integration can, by itself, synchronize curriculum from Airtable.
- The existing Memberstack OAuth flow still sends extra Supabase verification emails. Authentication and membership authorization are unfinished.
- This integration does not publish staged curriculum to members or authorize free test-plan members to see development-only records.
