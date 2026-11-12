# Supabase database development

This directory will hold the tracked schema migrations, functions, and tests for the new Alveary Planning App.

**Hosted development project:** Alveary Planning - Development (project ref `fzitmrzuxxdmvrhftdkr`).

**Current state (2026-11-12):** The hosted project's `public` schema has no app tables, and there are no migrations. The existing Memberstack / Supabase sign-in experiment does not yet establish publication-year authorization. No database schema is deployed by this bootstrap.

## Safety rules

- The existing 2026-27 app at `planning.alveary.org`, its Airtable source tables, and its GitHub workflows are outside the scope of this repository.
- Never commit database passwords, Airtable tokens, Memberstack secrets, or Supabase service-role/secret keys. Only the publishable key may appear in browser build configuration.
- Treat the development project as an *active hosted project*, not a disposable local database; changes are reviewed before deployment.
- Before any exposed table serves members, enable RLS and test with real public, active-member, former-member, and developer accounts. Merely being signed in is not sufficient.
- Development-preview membership must be checked server-side against trusted Memberstack data and a separate developer allowlist; owning a free test plan alone is not sufficient.
- Never copy protected resource URLs or private records into public GitHub JSON or other public files.
- Every curriculum publish must be validated and versioned; an unfinished sync cannot replace the current approved release.
- Schema changes should be created with the Supabase CLI's `migration new` command, tested, reviewed in a pull request, and applied only after approval.

## GitHub connection

See [GitHub ↔ Supabase setup](../docs/supabase-setup.md). Connecting the GitHub repository does not itself migrate curriculum from Airtable. The Airtable → Supabase publisher is a separate read/validate/stage/promote pipeline to build.

The root `supabase/config.toml` is starter configuration. CLI v3 defaults to the local stack for DB commands; use an explicit remote target only when intentionally operating on our development project.
