# Alveary — Plan Your Year

2027–28 Alveary curriculum planning application built with React, Next.js, and Supabase.

**Development site:** https://plan.alveary.org  
**Existing live 2026–27 planner (separate repository; do not modify):** https://planning.alveary.org

## Architecture

- **Curriculum authoring:** Charlotte Mason Institute's Curriculum Planning Airtable base.
- **Curriculum publishing:** an upcoming validated, versioned Airtable → Supabase sync, separate from the old Rotation 3 GitHub JSON jobs.
- **Member planning:** Supabase, with private family/student selections and schedules; annual entitlements must be enforced server-side.
- **Membership:** Memberstack for identity and eligible plans. Developer preview and production-year membership are separate grants.
- **Code/deployment:** this GitHub repo deploys the statically exported Next.js site to GitHub Pages.

## Supabase setup

The `supabase/` folder has been prepared for tracked migrations and functions. There are **no application schema migrations or data imports yet**.

- [GitHub ↔ Supabase setup and safeguards](docs/supabase-setup.md)
- [Full-curriculum publishing/data contract](docs/curriculum-publishing-contract.md)
- [Existing sign-in pilot and unresolved security work](docs/auth-and-public-views.md)

## Release targets

- **February 1, 2027:** working Overview, Courses, Books, and Scheduling.
- **June 1, 2027:** member releases for Supplies, Lesson Plans, and Exams. Until then, ordinary members see clearly labeled upcoming features.

Never commit secret keys, passwords, unpublished protected destinations, or household records. Do not treat a successful sign-in as proof of active publication-year membership.
