# Book List + connected Planning Desk — living roadmap (2027–28)

**Status:** Working product specification and build checklist, recorded November 19, 2026.  
**Applies to:** `kkeel/alveary-planning-app` / `plan.alveary.org` only.  
**Purpose:** Preserve the agreed member experience and let every implementation PR track what is complete, changed, or still open.  
**Update rule:** Check off an item only when built **and tested**. Add PR numbers and dates in the progress log; revise this document when the design changes.

Related foundations: [Course planning workspaces](course-planning-workspaces-phase1.md), [responsive shared desk](planning-desk-balanced-responsive-split.md), [member workspace/year contract](member-workspace-year-plan-contract.md), [curriculum schema](curriculum-schema-v1.md), and [publishing contract](curriculum-publishing-contract.md).

## 1. Experience we want to protect

Alveary members should be able to browse the whole book catalog without feeling that they must buy everything, automatically see the resources relevant to their chosen courses, personalize their book choices, keep a lasting record of books they own or have saved, and move naturally between **courses → books → preparation → cost**.

One connected information model should answer increasingly specific questions without making the member start over:

> What do I need for Term 1? → Which books must I obtain? → What have I ordered? → How much remains to spend? → Which course or topic uses this book?

**Key distinction:** The portable/mini Planning Desk is a **stable companion** to a browsing list. The full Planning workspace is an **adaptable area for working with connected information**. They share data and affordances, but need not use identical column proportions.

### Confirmed product decisions

1. **Book List keeps List | Planning.** Public Explore Books is a browsable catalog with course/grade/subject filters, book details, and permitted purchase links. Signed-in List mode retains the catalog plus a portable desk. Planning mode opens a full member workspace.
2. **On the Book List, the portable desk always has `My Books` and `Budget` tabs**, including when the main catalog is showing *all* Alveary books. Never swap those tabs to course/Think Tank tabs because a catalog filter changes.
3. **The portable My Books tab is a real compact view of the member's books**, organized with expandable subject/course/topic/resource context and useful readiness information, not just summary tiles. The full Planning view expands the same underlying book information.
4. **Portable My Books and Budget use the same personal-book filter context** (for example term, status, student/course if selected). The budget tab shows costs for the corresponding book selection. Neither tab silently inherits unrelated catalog filters.
5. **Catalog filters and portable-desk filters are independent by default.** Provide an explicit `Show these in List` / `View in full Planning` transition to transfer the member's focus when wanted; do not unexpectedly narrow public browsing.
6. **The full Planning workspace uses adjustable emphasis:** one primary area can expand or contract, with an optional secondary panel for related books, courses/topics, or budget. Preserve the existing side-by-side Think Tank + My Plan arrangement for comparing course ideas with committed choices.
7. **Cross-page View Books and View Course/Topic actions preserve exact context** (canonical IDs and the originating course/edition where a shared topic is involved). They open visibly focused views with a clear way back, and do not modify any saved plan.
8. **My School Books is automatically derived from My Plan's selected course/topic uses**. No repetitive one-by-one adding of all published resource recommendations. Exclusions and exact edition/student/course context matter. A recommendation is **not** an automatic purchase commitment.
9. A member can **Not using**, **Substitute**, or **Add another book** for a particular course/topic use. Substitutes can come from another Alveary grade/course or, later, a member-entered resource. The original recommendation/rationale remains recoverable. Different students/course contexts can make different decisions.
10. **My Library is persistent across school years**: owned and deliberately saved resources. It is not automatically filled with every school-year recommendation. A book may be owned, saved, and used in multiple curriculum contexts without multiple library copies.
11. **Think Tank books are possibilities, not committed purchases.** They may be viewed and compared with My Plan books, but must not inflate school-year buying lists or committed budget totals.
12. **Budget extends the current resource focus, rather than acting as a disconnected second list.** Make visible the difference between estimated costs, actual paid amounts, outstanding amounts, and the exact filtered subset those totals refer to.

## 2. Vocabulary and where things live

| Concept | Meaning / source of truth | UI location |
| --- | --- | --- |
| **All Alveary Books** | Catalog resource records and assignments for the selected release | Public Explore / main Book List |
| **My School Books** | Resources relevant to the current workspace-year plan, plus personal additions/substitutions; individual uses may be not-using or undecided | Mini My Books; Book List scope; full Planning |
| **My Library** | Member/workspace's intentionally saved and owned titles, across years | Under My Books; dedicated scope/filter when useful |
| **My Books** | Member-facing **tab / workspace** combining current school books and access to My Library | Mini and full Planning |
| **Budget** | A **cost perspective** on selected book uses and intended acquisitions, not a new set of book records | Mini tab; full focus; optional related panel |
| **Think Tank resource context** | Book possibilities attached to course ideas not yet in My Plan | Connected course/resource view, never default committed spend |

Do not confuse the catalog's `Choose One` **advisory** alternatives with a forced mutually exclusive radio choice. Unselected alternatives are not separate required purchases. Optional books must remain distinguishable from required recommendations.

## 3. List-mode behavior

- Public Explore: all permitted book records; search, subject, grade, country, course/topic context, applicable resource information, rationales, alternative formats and eligible purchase links. Never expose private saved states.
- Member List: the same browsing area with a **scope** such as `All Alveary Books`, `My School Books`, and possibly `My Library`. Scope changes which records appear; `Compact / Expanded / Detailed` changes only information density. Keep independent remembered view preference(s) as with Courses.
- Main List and mini desk show together on wide screens; retain the existing responsive 370px portable-desk and drawer conventions when workspace width is narrow. The desk stays **My Books / Budget** in every Book List scope.
- Portable desk: show member book rows grouped by familiar subject/course context, with an optional `By Status` presentation. Initial simple filters: term and readiness/acquisition status. Add student/course refinement when real needs warrant it.
- Filtering the mini desk does not change the main catalog. Offer **Show these in List** to apply the personal-book selection deliberately. The filtered budget remains consistent when switching tabs.
- A temporary `Viewing books for: [Course / Topic]` focus can override the main catalog scope without destroying persistent search, grade, or country preferences; provide Clear Focus and Back controls.

## 4. Full Planning behavior: one main area, optional related information

- **Course emphasis:** keep the existing two-column Think Tank + My Plan comparison as the default comparison layout. From a selected course/topic, optionally bring related books into a companion panel, temporarily tucking away a comparison column; closing restores it without changing any plan choice.
- **Book emphasis:** My School Books or My Library is the primary, roomy workspace for filters, book prep, ownership, saving, alternatives, substitutions, and course context. Optionally show related course/topic use or a budget panel.
- **Budget emphasis:** same selected books, shown with prices, quantity, acquisition, paid/estimated/remaining costs. An optional related-books panel preserves book identity and preparation context.
- Secondary panels **follow the explicit main focus** and have a clear close/restore affordance. Avoid exposing an unrestricted layout builder or dozens of toggles.
- Expanding the mini desk should start with its current **My Books vs Budget tab and its filters**, then give more room and context. Returning to List preserves previous browsing position as feasible.
- Distinguish changes in **view** from changes in **saved selections**; switching focus, term, group, panel, or scope never silently edits a course, book, or budget.

## 5. Connected navigation and substitution flow

### Cross-page navigation

- From any Course List / Think Tank / My Plan `View Books` action, open the Book List focused on the exact course or topic and its applicable resource assignments. Preserve parent-course identity for shared topics. Provide a backlink to that course in its familiar Course List context.
- From a book, `View Course/Topic` opens a focused Course List context. If multiple uses exist, show a brief chooser or the linked course usages first; never guess which course is meant.
- Prefer **full filtered views for actual planning**, with small popovers/inline details for short context previews. Avoid a stack of modals. Deep links must validate known IDs, never accept arbitrary source URLs or reveal member-only content.
- Existing prototype links in `PlanningDesk.tsx` and `MyPlanPanel.tsx` already use `/books?course=...`; `app/books/page.tsx` is still a placeholder, so the filtering behavior and reverse links need implementation. The shared desk currently navigates to Course Planning from Books; make full-planning routing context-aware.

### A recommended resource in My School Books

- Default recommendation: **To decide** (not automatically a future purchase).
- Actions: **Use as recommended**, **Not using**, **Substitute another resource**, **Add an additional resource**. Keep official Alveary recommendation and rationale available and reversible.
- `Substitute` links the new resource to a specific member course/topic/student context and identifies the recommendation it replaces. Warn gently that reading/page references in published lessons may need adjusting; do **not** rewrite published lessons or packet PDFs.
- Offer catalog browse/selection for substitutes and additional books; plan a separate later workflow for custom member-entered books.
- Resource editions/formats and multiple student/course usages must not be flattened into a single undifferentiated checkbox.

## 6. Data contracts to validate before write operations

These are **logical concepts**, not a claim that corresponding tables have already been deployed. Confirm the current secured demo/workspace model before migrations.

1. **Canonical catalog resource** and its public metadata; **release-scoped Resource Assignment** to a specific edition, with linked assignment items, term applicability, optional/role/`Choose One` guidance, and source-record IDs.
2. **Member course/topic/student usage context** that resolves which resource assignments apply, while honoring partially included combined-course topics and shared-topic provenance.
3. **Member resource decision / override** per applicable course/topic (and student where appropriate): default, use, not using, substitute, add, optional choice. Do not alter the catalog source.
4. **Persistent workspace library / holding**: resource or member-entered item, saved flag and owned/format/quantity data, independent of year-specific plan.
5. **Year-specific preparation / acquisition record** linked to one logical item and its many uses: method (buy, own, borrow, ebook, etc.), readiness (to decide, need to get, ordered/requested, received, ready) and explicit quantities. Reuse one physical copy where valid; permit extra copies when needed.
6. **Financial line items**: expected price, actual amount **paid**, payment/order/receipt dates or states where appropriate; totals must not equate `ordered` with `paid` and must avoid double-counting a book used in multiple courses or terms.
7. **Time attribution**: Term 1/2/3 and resources with unspecified or multi-term use; don't assign an unknown term by assumption. A book needed in both Terms 1 and 2 is one purchase unless its quantity says otherwise.
8. **Workspace authorization**: server-verified Memberstack entitlement plus workspace/year access and Supabase RLS for any private member plans/library/preparation/budget. Preserve current public vs protected split; no client-only enforcement.

## 7. Implementation sequence and checklist

Checkboxes mean **implemented + verified**, not merely designed. Phases are incremental and independently testable.

### Phase 0 — Lock direction and project references

- [x] Record agreed member experience, vocabulary, data boundaries and phased plan in this document (November 19, 2026; review PR pending).
- [ ] Review the plan and record any terminology/layout changes in **Decision log** below.
- [x] Confirm the current app's secured plan endpoints and identify resource publishing/public-member field gaps; private 2027–28 resource staging is now present, but no approved public/member resource projection yet (November 20, 2026).
- [ ] Identify shared UI components: portable/full desk, reusable book rows, book filter state, and link focus.

### Phase 1 — Usable Book Explorer and portable desk foundation

- [ ] Implement the full approved read-only Book Explorer. **Draft preview in PR #134** now shows 345 source-backed titles, course/topic assignments, search, familiar detail modes and safe links. Still open: explicit release approval, approved unassigned library resources, complete alternative-format and stable cover-image handling.
- [ ] Introduce member Book List `List | Planning` modes, with consistent Compact / Expanded / Detailed behavior and preserved preferences.
- [ ] Keep a Book-specific portable desk showing **My Books / Budget**, independent of the main Book List scope. Reuse shared shell/drawer/quiet-mode patterns, not a second competing desk implementation.
- [x] Build initial My School Books derived view from actual selected course/topic/student assignments, preserving optional/advisory choice context and showing recommendations as undecided rather than purchased (PR #134).
- [ ] Honor `View Books` deep links from course/topic rows; provide focused heading, clear/reset and direct return path.
- [ ] Test public/private gating, 810px-ish workspace responsive crossover, long names, accessibility, and no effects on existing Courses/Think Tank/My Plan.

### Phase 2 — Book decisions and family library

- [ ] Add `Use`, `Not using`, `Substitute`, and `Add another` with course/topic/student-context specificity; preserve official source recommendation and undo.
- [ ] Allow finding books from other grade/course contexts through All Alveary Books; make `Add to plan` and `Save to My Library` different actions.
- [ ] Persist member library `Owned` vs `Saved` intentionally, across year plans, without treating every recommended title as owned.
- [ ] Implement reverse `View Course/Topic` links with multiple-use chooser and shared-topic provenance.
- [ ] Add member-entered personal resources if schema and priority are ready; otherwise explicitly defer with a documented follow-up.

### Phase 3 — Preparation and connected mini Budget

- [ ] Manage acquisition method, status (to decide / need to get / ordered or requested / received / ready), quantities and applicable terms.
- [ ] Portable My Books can be grouped by course or status and filtered by term/status; row-level actions remain available without clutter.
- [ ] Portable Budget applies **the same personal-book filters** and shows correctly labeled selected-subset totals versus full-year totals.
- [ ] Record estimate versus actual paid, avoid counting already-owned and shared resources twice, and calculate remaining estimated spending without mistaking orders for payments.
- [ ] Implement explicit `Show these in List` / expand Planning handoff with clear inherited filters and an easy reset.
- [ ] Add browser tests for a Term 1 Need to Buy → Budget → Ordered/paid/remaining flow, including a multi-term shared book.

### Phase 4 — Connected full Planning workspace

- [ ] Full Book Planning prioritizes a main workspace and optional Courses or Budget side panel; expanding the mini desk keeps its tab/filter context.
- [ ] Main workspace switches emphasis Courses / Books / Budget without editing selections or losing valid focus.
- [ ] Preserve the existing Think Tank + My Plan two-column comparison, with an optional temporary `Related Books` pane for a selected course/topic and a restore action.
- [ ] Support Think Tank books as a separate *possible resource* perspective; never include them in committed purchase totals without an explicit planning decision.
- [ ] Verify focus/back navigation, scroll/disclosure memory, keyboard/mobile behavior and clean close/restore.

### Phase 5 — Supplies and consolidated budget (later release)

- [ ] Reuse the resource/preparation and budgeting patterns for Supplies without losing book-specific context.
- [ ] Offer combined Books + Supplies budgets and term comparisons once Supplies is published and authorized.
- [ ] Align scheduling/lesson navigation and printable lists with approved publication access; no automatic substitution of published lesson/PDF content.

## 8. First coding slice (start here after roadmap review)

**Suggested first implementation PR:** Build the **read-only Book Explorer + Book-specific mini-desk shell** using real published/staging book metadata and the existing shared Planning Desk framework; respect public access, and show an honest member empty/derived state until real book selection/preparation writes exist.

Keep that PR narrow:
- establish a correctly filtered public book catalog and the two stable mini tabs;
- wire the existing `View Books` course parameter into a visible focused filter (including a clear/reset action);
- *do not* yet create financial records, automatically charge anything, pretend members own resources, or overhaul the Course Planning UI.

After testing that foundation with a few real combined, single-topic and shared-topic courses, move to member-owned book decisions, preparation, budget and full connected views in separate reviewable PRs.

## 9. Acceptance scenarios to keep checking

1. Browse All Books while portable **My Books** remains visible; filter the mini desk to Term 1; main catalog doesn't unexpectedly narrow.
2. Switch mini from My Books to Budget: the personal Term 1 filter carries over, and the relevant subset totals are clearly labeled.
3. Click `Show these in List`: only then does the main list intentionally adopt the mini focus; Clear Focus restores the prior list state.
4. Click `View Books` for a combined course; see its applicable topic-specific and shared resources once per logical book, with provenance preserved. Return to original course with view preferences intact.
5. Click `View Course/Topic` from a multi-use book: choose intended context; don't conflate two course editions sharing a topic.
6. A member uses a book for one student but substitutes it for another. Neither decision changes Alveary's catalog or the other student's plan.
7. A member marks one book `Not using`, chooses a substitution from another grade, then reverses it; their original recommended source remains available.
8. An undecided or optional book appears for planning but isn't a confirmed amount to buy. Think Tank suggestions are never committed spend.
9. A shared physical book used by two subjects and two terms appears with multiple source uses but only one planned acquisition unless quantity is greater than one.
10. A book is ordered but unpaid; distinguish order status, readiness and actual expense. A paid, not-yet-delivered book is no longer unspent budget.
11. Save a book in My Library but not My School Books; it persists independently of a school year and removal of a course.
12. Full Planning switches Books → Books + Budget → Books + Courses; closing the companion restores primary width and preserves the member's plan and filters.
13. Public visitors see Explore without member data or protected resources. Narrow screens use the established drawer; no double panel or trapped scroll.

## 10. Decision log / open questions

| Date | Decision / question | Status |
| --- | --- | --- |
| 2026-11-19 | Mini Book List desk **always** offers My Books / Budget regardless of main catalog scope | **Agreed** |
| 2026-11-19 | Mini My Books is an actual compact working list; Budget extends the same filtered records | **Agreed** |
| 2026-11-19 | Full Planning: flexible primary focus + optional related panel; retain Think Tank + My Plan comparison | **Agreed direction; layout to prototype** |
| 2026-11-19 | Derive My School Books from My Plan; permit not-using, substitutes and personal additions; keep My Library intentional | **Agreed direction; exact save semantics to validate** |
| 2026-11-19 | Main catalog scopes All Alveary Books / My School Books / My Library | **Proposed; confirm actual placement/labels in first UI pass** |
| 2026-11-19 | Default member catalog scope (All vs My School Books), and precise mini status/grouping controls | **Open — test with UI** |
| 2026-11-19 | Member-entered custom book details, external ISBN lookup, supplier price auto-import | **Deferred unless separately designed** |
| 2026-11-19 | Whether to preserve browser back stack or temporary context stack when hopping between Book and Course focus | **Open — test navigation prototype** |

## Book Explorer organization decision (2026-11-20)

The previous unique-resource subject list was useful as a catalog but obscured
the **actual course or topic where a resource is assigned**. For returning
Alveary members, the default Book List needs to be curriculum-first.

- **Default: By Course.** Show Subject → Course → Topic → Resource. For a
  **Single-Topic Course**, omit the redundant Topic layer; its resources appear
  directly beneath the course. Combined courses display resources under the
  authored child topics; any genuinely parent-assigned resource appears at the
  course level.
- **Alternative: By Book.** Alphabetical unique-title list with the same
  resources and existing book-detail controls. This is a change of
  **organization**, not a distinct collection and not a replacement for
  Compact / Expanded / Detailed.
- In **By Course**, the *same book can appear in multiple course/topic
  contexts*. This is intentional and mirrors the existing Alveary Book List.
  In **My Books / Budget** and By Book, each canonical resource remains
  consolidated, and an acquisition is not multiplied by the number of
  curriculum appearances.
- **Term, grade, country, subject and search must be evaluated on the actual
  context/assignment before rendering.** Term 1 usage for one topic never
  makes a resource appear in an unrelated Term 1 topic. Search accepts course
  and topic titles as well as book titles/authors/ISBNs.
- **My School Books** derives course contexts from My Plan, with only included
  topics that are effectively assigned to at least one student within that
  exact parent course. Think Tank ideas remain excluded.
- **A visible scope explanation** says whether the member is viewing
  resources from My Plan or exploring the broader 2027–28 catalog. New
  member preferences default to My School Books when no prior choice exists;
  existing saved choices are honored. The independent portable mini desk
  remains My Books / Budget.
- For **All Books** with no active search/focus, Subject and Course headings
  are available to scan while course contents start collapsed; selecting a
  course reveals topic headings and book rows. My Plan, focused course/topic,
  and searches open matching courses by default. Topic groups are collapsible
  independently. Disclosure remains keyboard-accessible via native
  \`details\`/\`summary\` elements.
- Use the new compact cover-led resource rows; avoid restoring large cards,
  repeating subject/course titles on every book row, or adding deep
  indentation. This stage does not add purchase decisions, library writes, or
  budget costs.

**Implementation:** PR #136, \`app/books/book-course-groups.mjs\` and
\`app/books/BookCourseHierarchy.tsx\`; tested against 2027–28 assignments
plus synthetic shared-topic and cross-term cases. Visual/mouse/mobile
behavior still requires manual browser review after deployment.

## 11. Progress log

| Date | PR | Outcome | Follow-up |
| --- | --- | --- | --- |
| 2026-11-19 | Documentation PR (this file) | Captured member vision, foundation and checked implementation sequence | Review, then begin Phase 1 coding PR |
| 2026-11-20 | [#132](https://github.com/kkeel/alveary-planning-app/pull/132) | **Phase 1 foundation**: independent Books List/Planning mode, stable My Books/Budget mini desk in shared shell, full Book Planning placeholder, validated parent-aware View Books focus; automated PR build passed. Actual resource data and book rows are *not* connected. | Manual browser review after merge, then resource/assignment publishing contract and true Book Explorer rows |
| 2026-11-20 | #133 (this PR) | **Book resource staging**: 345 canonical resources, 447 exact edition assignments, 483 assignment items and 549 validated HTTPS links imported into private RLS-protected development Supabase; publication contract and QA smoke test recorded. | Validate public/member-safe projections, cover images and excluded links; next PR should replace the Book Explorer placeholder with reviewed resource data |
| 2026-11-20 | [#134](https://github.com/kkeel/alveary-planning-app/pull/134) | **Public-safe Book Explorer draft**: all 345 book/resource titles, including the 43 member-only resources, with zero external links for those restricted records; course-focused resource list and derived member My School Books. | Review browser layout, incomplete 2027 catalog coverage and secure entitled-member link release |
| 2026-11-20 | #135 (this PR) | **Visual polish**: permanent GitHub cover mapping for 317 exact title/ISBN matches, optional Airtable cover sync into new GitHub Pages assets, self-contained List/Planning styles (fixes refresh regression), corrected mini-desk padding, simplified browse controls and familiar cover-led book rows with rationale and purchase options. | Review desktop/mobile in a deployed preview; set `AIRTABLE_PAT` read-only Actions secret and run cover sync for the remaining 28 and refresh all new-version files |
| 2026-11-20 | #136 (this PR) | **Course-based organization**: Subject → Course → Topic books by default; By Book alphabetical consolidation; per-assignment term/search filters, current My Plan scope explanation and saved organization preference. | Review nested mobile layout, shared-topic repeated rows, member plan vs All Books, and existing mini book desk independently |
