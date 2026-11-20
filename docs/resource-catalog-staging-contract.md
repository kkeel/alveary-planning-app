# 2027–28 books: private catalog staging and publication gates

**Date:** 2026-11-20  
**Scope:** Development Supabase project `fzitmrzuxxdmvrhftdkr` and `kkeel/alveary-planning-app`.  
**Status:** Actual resource records imported into **private draft staging**; **not** published to the Book List and **not** approved for public/member Data API access.

See also [Book List & connected Planning Desk roadmap](book-list-connected-planning-roadmap.md), [curriculum publishing contract](curriculum-publishing-contract.md), and [2027–28 curriculum schema](curriculum-schema-v1.md).

## What was verified in Airtable

Connected base: **Curriculum Planning**. Source tables:

| Airtable table | Purpose | Records at inspection |
| --- | --- | ---: |
| `Lesson Plan Editions` | Exact edition IDs and publication-year selection | 1,156 |
| `Resource Assignments` | Exact edition use, term applicability, optional/choice/role | 600 |
| `MA Library` | Canonical resource identities, title, rationale, author, ISBN, links, availability, member-only flags | 1,887 |

The development course catalog contains **377** selected 2027–28 edition IDs (a draft; not a publication approval). Joining resource assignments on those *edition IDs*, **not names**, yields:

| Entity | Draft records staged |
| --- | ---: |
| Selected resource assignments | **447** |
| Linked resource items across those assignments | **483** |
| Unique canonical resources | **345** |
| Valid HTTPS purchase/info links | **549** |
| Unique resources flagged `Is Member ONLY` | **43** |
| Individual source links flagged member-only | **38** |
| Assignments with an advisory `Choose One` flag | **19** |
| Optional assignments | **24** |
| Assignments with no T1/T2/T3 use specified | **4** |

Of the 600 authored resource assignments, **153** do not match an edition selected for this development-year snapshot; they were not imported into this release. The difference is intentional release filtering, **not** deletion from Airtable.

An assignment with multiple linked resources preserves **one assignment record with multiple item rows**. Its `Choose One` field is an advisory recommendation, never a forced exclusive choice. One resource can have several assignment uses. Term fields preserve literal values such as `Full Term`, `Partial Term`, `Selections`, `One Lesson`, or `Assign`; do not infer that every record is used all term.

### Fields deliberately not treated as public approval

- `Review Status` is a source production/review category (for example `In Print`, `Reviewing`) and **does not approve public distribution**.
- `Availability` may contain internal preparation values (such as `Not Started`) and is **not** the member's purchase/acquisition status.
- `Is Member ONLY`, per-link `Link 1/2 Member ONLY`, and `Delay Live Link` must stay authoritative until approved projection rules are documented and tested.
- Airtable attachment URLs are temporary/expiring. This import **does not** copy image URLs; create durable, reviewed cover-image assets before displaying them as lasting catalog thumbnails.
- The source `Resource Type` is unset on most records; don't infer an official type/format from missing fields.
- The app must distinguish catalog *resource*, edition-specific *assignment*, individual *assignment item*, and member-owned *preparation*.
- Eight non-HTTPS source link fields (seven `http://`, one URL missing a scheme) were **not imported into the HTTPS-only links table**. Review and fix/replace in Airtable, rather than guessing a destination or silently rendering an unsafe URL.

## What was created in Supabase

Migration **`20261120141137_catalog_resource_assignments_private_staging`** (exact file in `supabase/migrations`) adds four release-scoped tables:

1. `catalog_resources` — canonical resource title, author, ISBN, draft rationale/notes, review/availability metadata, member-only and delayed-link flags.
2. `catalog_resource_assignments` — specific source assignment ID → specific selected edition ID, role, optional, advisory choice, order, T1/T2/T3 and assignment-specific notes.
3. `catalog_resource_assignment_items` — ordered assignment → canonical resource junction; intentionally many-to-many.
4. `catalog_resource_links` — separate source links, positions and member-only flags, HTTPS-only at staging.

Every table has **release-scoped composite keys/foreign keys**, row-level security enabled, **no public or ordinary authenticated access policies**, and direct `anon`/`authenticated` grants revoked. The staging import used authenticated administrative tools; no credentials, source API tokens or unpublished data were committed to GitHub.

### Live verification on 2026-11-20

- Resource/assignment/item/HTTPS-link counts were checked after import.
- All four tables returned `rls_on=true`, `anon_select=false`, `authenticated_select=false`, `anon_insert=false`, `authenticated_update=false`, and **zero user-facing RLS policies**.
- Supabase security advisor lists `rls_enabled_no_policy` at informational severity; for these private staging tables, that is **deliberate deny-by-default**, not a missing publication grant.
- No catalog release route was approved or altered. No workspace, student, course selection, budget, or 2026–27 production data was modified.

## Publisher work to complete before the real Book Explorer

- [x] Confirm exact Airtable source IDs and edition join across all current development editions.
- [x] Create the versioned private schema and stage linked resource records.
- [x] Check staging counts, advisor output, row-level security and revoked browser grants.
- [ ] Add a repeatable **read-only Airtable extraction/validation** and an idempotent, service-only snapshot publisher; publish only a complete validated release, not partial updates.
- [ ] Define a reviewed **public-safe resource projection** and a **member-authorized projection**, with separate URL permissions and year/surface release routes. Never expose draft staging just because a user is signed in.
- [ ] Review eight invalid/non-HTTPS link fields with curriculum editors; handle absent `Resource Type` and legitimate external/digital formats.
- [ ] Add stable book cover-image handling; never rely on expiring Airtable attachment URLs in shipped JSON.
- [ ] Confirm handling for `Add Alt. Format` and `Alt. Format For:` records and any resources not assigned to this release. An `All Alveary Books` public catalog scope may include approved extra resources beyond the 345 currently assigned to selected editions.
- [ ] Approve public/member browsing scope and resource fields before turning on the real Book Explorer.

## How the app will use these records

- **All Alveary Books:** public-approved canonical resources + relevant edition use metadata only; keep source member-only fields out of its payload entirely.
- **View Books (course/topic):** resolve actual selected parent/child edition IDs, collect assignment records for the exact edition(s), preserve each resource's role, optional flag, alternative grouping, term selections, and source assignment ID. Show a resource once in the household book-preparation list but retain all of its uses.
- **My School Books:** derive from *actual My Plan* topic/course/student uses, then overlay member resource decisions. Do not mark every recommendation as a confirmed purchase.
- **Think Tank:** display hypothetical book needs but never count them as committed costs.
- **My Library:** independently owned/saved resources across school years, not inferred from a recommendation.
- **Budget:** later overlay member purchase methods, estimates, actual payments and deduplicated quantities on those same resources. Staging catalog contains **no prices paid or member budget state**.

## Next development PR

Build a **gated, read-only Book Explorer** against a **reviewed/approved source projection** with actual titles, rationales, roles, term info and source-course links, then replace the explanatory empty states in `app/books/page.tsx` and `BookPlanningContent.tsx`. Do not grant `anon` or `authenticated` SELECT on all staging tables as a shortcut. Follow with member book decisions and budget records.

