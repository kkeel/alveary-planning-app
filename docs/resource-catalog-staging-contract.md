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

## Clarified public visibility rule (2026-11-20)

**Member-only is a *link-access restriction*, not a resource visibility filter.** A resource with Airtable `Is Member ONLY` remains visible in **public Explore Books**, including its title and safe descriptive metadata, but **none of its external resource/purchase URLs** may be emitted in the publicly downloaded data. Do not just hide the link buttons in React; URLs must be absent from the public payload itself.

- For a resource marked `Is Member ONLY`: show title, author/creator, ISBN and published-style rationale, subject/course context and applicable terms. Export an **empty `links` array**, irrespective of whether Link 1 or Link 2 was individually flagged.
- For an otherwise public resource: export only HTTPS links whose **individual** `Link N Member ONLY` flag is false and whose resource `Delay Live Link` is not set. Exclude malformed URLs rather than guessing a correction.
- For a genuinely authorized member in the future: access to protected URLs must go through separately reviewed **server-verified membership and release entitlement checks**. A signed-in browser account alone does not unlock them.
- Keep source internal availability, review workflow notes, staff-only comments, temporary attachment URLs, and other draft-only fields out of the public projection.
- The **2027–28 draft preview** is not the approved public release route. Continue to label it as draft; don't use this export as a substitute for formal per-surface publication approval.

A generated public-safe development snapshot now contains **345 resources, including all 43 member-only resources, with zero links on those 43 records**. The original 549 HTTPS source links are reduced to **511** allowed unrestricted public links (38 individually marked member-only links were withheld). The full staging tables remain private under RLS and revoked browser grants.

## Publisher work to complete before the real Book Explorer

- [x] Confirm exact Airtable source IDs and edition join across all current development editions.
- [x] Create the versioned private schema and stage linked resource records.
- [x] Check staging counts, advisor output, row-level security and revoked browser grants.
- [ ] Add a repeatable **read-only Airtable extraction/validation** and an idempotent, service-only snapshot publisher; publish only a complete validated release, not partial updates.
- [x] Create a **public-safe development projection** containing every title (including member-only ones) but no protected URLs. This is a draft-preview artifact, **not a release-route approval**.
- [ ] Build separately authorized **member-only link retrieval** and reviewed public/member projections for approved publication routes. Never expose draft staging just because a user is signed in.
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

