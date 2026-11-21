# Book List content-first publication and presentation review

**November 20, 2026 · PR #138**  
Reference: [Approved Alveary design system](alveary-design-system.md).

## Decision implemented

- A **new Book List browsing preference defaults to Detailed**. The full resource rationale displays by default, not a two-line excerpt. Compact and Expanded remain intentional choices, with click-to-open full details. **Expanded also shows the full rationale and previously published planning notes**, so members whose existing saved preference was Expanded do not lose the context. Compact is the only mode that hides rationale text by default. Existing member display preferences are still honored.
- Render **unchanged, already publicly published** book planning notes as a distinct **Planning note** below the full rationale, when present. Keep cover/title/author/terms/role and permitted links visible. Resource note is not a second rationale or a substitute for assignment-specific guidance.
- Reduce the visually boxed-in feeling of long rationale text: use an integrated, lightly tinted background with sensible text width; no new vertical rail for every book rationale.
- Confine the updated color tokens to **Book List and its Book Planning Desk**. Use only approved Alveary swatches or permitted transparency variants. Do **not** change Course List CSS, subject selection colors, rails or hover affordances.

## Data audit and publication boundaries

The current draft catalog has **345 resources** and **447 resource assignments**. Airtable `MA Library → NOTE:` contains non-empty text for **188** resources in the 2027–28 preview. These notes have not been independently approved as a *new* publication batch.

For a conservative, useful first pass we matched book **title + ISBN/ASIN** against the **previously publicly published** `kkeel/course-picker/data/MA_Resources.json`. We shipped only **177 exact text matches** without embedded `http(s)://` or `www.` strings. They are exported separately as `app/books/public-resource-notes-preview.json`. **No unpublished, changed, staff-only or draft notes were added to the public resource catalog.** The public resource records still omit the `notes` field.

| Current notes | Count | Treatment |
| --- | ---: | --- |
| Identical to previous public text, no URL | **177** | Available under **Planning note** |
| Identical to previous public text, includes URL | **3** | Withheld pending link/permission review |
| New or changed compared with prior public text | **8** | Withheld pending editorial review |
| No current library note | **157** | No note displayed |

### Assignment-specific writer guidance — separate review needed

In the current imported resource assignments, the `Course/Topic Level Rationale` field is populated for **one** assignment; `Course/Topic Level Note(s)` has **zero** populated values. Term-specific `Add note T1/T2/T3` fields are populated for approximately **51 / 53 / 50** current assignments. These include lesson/page/grade instructions and should be shown with the relevant assignment and term **after a separate field-level publication review**; they must never be merged into a global note for the same book used by multiple courses.

These assignment-specific fields **are not included** in PR #138. Their omission is explicitly recorded as a follow-up, not silently treated as content that doesn't matter.

### Safety checks

- Source notes remain plain text; no unsafe HTML/Markdown execution.
- Existing public-preview restrictions still exclude all external links on the **43 member-only resources**, even when their titles/covers/rationales are public.
- The staging Supabase tables remain protected; no new browser grants, RLS or release-route changes.
- No manual book selection, substitution, budget, or stored personal data is changed.

## Visual review after merge

Compare a book with a **long rationale**, one with a **Planning note**, a member-only resource, and one without a rationale; review By Course and By Book, full Planning and mini My Books, and mobile. Confirm an entirely new member sees Detailed by default; existing saved Compact/Expanded choices remain honored. Visually compare nearby Course List selected/partial/hover states to ensure none changed.

## Next content step

Review and authorize the **11 withheld** resource notes and the term-specific resource assignment fields, then publish them with their correct edition/term context. Don't make every term note a globally shared property of a canonical book.

## November 20 Book List guidance and grouping follow-up

The next read-only development preview uses **individual public-safe source fields** instead of parsing the two composite Airtable preview formulas.

- Preserve the existing **345 resources / 447 selected assignment records**, their edition/resource IDs, 43 member-only link restrictions and 177 previously published library notes.
- A separate vetted projection now contains published-style SAVE, PRINT, plain-text alternate-format tags, discounts/codes, May Sub instructions, exact `Resource Assignments → Grade Level Tag`, `Display Order`, `Term Sort`, and the one existing assignment-level rationale. These never introduce staff notes, internal review fields, private/member-only URLs, or member planning state.
- **Scope is only the actual assigned T1/T2/T3 labels** (e.g. Full Term, Selections, Partial Term), rendered in the upper-right of the rationale surface. **Do not publish `Add note T1/T2/T3`**; the user explicitly does not need those note fields in the new Book List.
- **Grade Level Tag is authored at the resource-assignment level** in Airtable and is never inferred from a broad parent-course grade range. Currently ten selected 2027–28 assignments carry a tag; untagged records are not guessed.
- Optional and Choose One remain distinct flags and retain the familiar original badge colors. Choose One alternatives display together in By Course; alphabetical By Book and the mini desk identify other options by title instead of implying all options must be purchased.
- **Default ordering per course/topic:** explicit Display Order wins, then ordinary Main/Supporting texts by Term Sort (T1/T2/T3), with Reference and Optional texts last regardless of term. Within ties, preserve source record order.
- For books used in several contexts, grade tags and rationale additions remain tied to individual assignment uses; their distinct variants may appear in a consolidated By Book perspective without overwriting a canonical resource.
- The linked member-owned library, real purchasing decisions, and budget writes remain separate, unimplemented capabilities. Source SAVE is a preparation instruction, *not* a member's personal Save action.

**Editorial boundary:** The eleven previously withheld changed/new/URL-bearing library notes remain withheld, and no staff planning notes enter member-facing data. This is an authorized visual/preview step, not a declaration that every draft field is released to production.

## November 20 follow-up: Book List row density and ↔ Shared by year

### Presentation adjustments
- Assignment-specific rationale is appended as ordinary prose after the library rationale in **Why we recommend it**, with no redundant edition title or extra label.
- Optional, grade-only and ungrouped Choose One badges sit **after the book title**; the familiar light text on the olive Optional badge is retained. True Choose One groups retain a single group heading without listing every book in an “or / or / or” sentence.
- Full detail content is rendered **within the text column**, not below a full-height book-cover grid row. This removes misleading empty space when a source book has no links and keeps covers at their present size. Empty link, May sub, discount, format, note and other optional fields are **not rendered**, never reserved as placeholders.
- Library format metadata uses the familiar **Alt. Formats:** label. A book assigned to multiple distinct course/topic paths in this release gains a compact **↔ Shared** line; one-off books have no shared line.

### Release-safe Shared derivation
`app/books/book-shared-contexts.mjs` derives the complete list of display paths using only:
1. **Release-scoped** resource assignment rows (`release_id`, `source_assignment_id`, `source_edition_id`).
2. That release's canonical resource assignment items (`source_resource_id`).
3. That release's course/topic edition lookup and shared-topic parent links (`catalog_edition_topics`).

For a given resource and **selected release**, find every assigned edition. When an edition is a shared topic, expand it into every *parent course edition* linked **in that same release**. Deduplicate display paths; show **↔ Shared** only when at least two distinct contexts exist. The visual labels use course and topic names *after* identity is determined by IDs, never title-matching to decide relationships.

**Never use Airtable's dynamic Current/Next Publication formulas as the serving-time Shared source.** At publishing time, select a complete staged snapshot for a specific `school_year` and edition year roles. The active `catalog_release_routes` row for **(school_year, surface, audience)** resolves the approved `release_id`. All queries for assignments, items, edition topics, and display labels are constrained to that identical `release_id`. Moving 2027–28 from “next” to “current” changes the appropriate routing/authoring status, **not** already published 2026–27 historical relationships. When editors revise the next year's source, publish a *new complete release* and atomically switch only its approved route after validation.

Example: a book shared between “Picture Study” and a separately linked course in 2027–28 should show the locations for 2027–28, even if those lesson-topic links differ from its 2026–27 associations. The member's My Library remains deduplicated by canonical resource identity; the curriculum use path is release-specific.

### Public vs member resource links
The checked-in `catalog-resources-preview.json` remains a **public-safe development snapshot**, with external link URLs fully absent on all 43 protected resource records. Neither a React badge, a hidden element nor a client-side signed-in flag constitutes authorization.

- Public readers see eligible general links only; protected resources retain title/rationale but no protected URL.
- The **cosmetic** member view suppresses the public lock badge and public-only access-warning text, but does not unlock or invent links; until a separately authorized retrieval route is built, a protected resource has no link buttons even for signed-in members.
- For real member-link delivery, implement a *separate* Supabase Edge Function or equivalently trusted endpoint, which verifies the presented OIDC identity **and current school-year Memberstack entitlement on every request**, resolves the correct approved `catalog_release_routes`, and returns only vetted, explicitly member-eligible URLs for that release. The current `memberstack-plan-access` proof of eligibility is not a blanket permission to expose draft tables.
- Keep Supabase private draft catalog tables behind their existing deny-by-default RLS and revoked `anon`/`authenticated` grants. Do not make a public JSON file of protected links, grant broad `authenticated` read, or put a secret/service key in browser code. Test as public, signed-in-without-entitlement, entitled member, and expired/revoked member before launch.
- Protecting the link endpoint prevents **unauthorized discovery through the app**; a destination URL that someone legitimately opens or forwards may still be independently shareable, depending on the destination site's controls. Signed URLs or destination authorization are required for stronger per-user access restrictions.

This is a presentation + calculation PR only. No source Airtable formulas, Supabase access policies, member entitlements, production release routes, or private link publication are changed.
