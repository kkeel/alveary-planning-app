# Book List content-first publication and presentation review

**November 20, 2026 · PR #138**  
Reference: [Approved Alveary design system](alveary-design-system.md).

## Decision implemented

- A **new Book List browsing preference defaults to Detailed**. The full resource rationale displays by default, not a two-line excerpt. Compact and Expanded remain intentional choices, with click-to-open full details. Existing member display preferences are still honored.
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
