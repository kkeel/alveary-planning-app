# Quiet Country filter in the Course List (November 13, 2026)

## Design decision

The user is satisfied with the current Course List and wanted a country filter that **does not crowd** the sticky search/filter bar. We kept the existing Grade button and added a compact **Country: All / U.S. / Canada** selector within its open panel, directly below the grade choices.

- The panel **stays open** while the user selects any number of grades or changes the country.
- Clicking outside closes it (as before); Escape closes it and restores focus.
- If a country is selected, the Grade button indicates that choice, such as `Grades 7–8 · Canada`, even after the panel closes.
- The **All** option is default. Choosing U.S. shows U.S.-specific **plus** Both-country courses; Canada shows Canada-specific **plus** Both-country courses.
- The subject, grade, search, and country filters combine rather than overriding each other.
- Existing grade-specific choice-group placement and grouping remain intact. If a future choice group includes different country scopes, ineligible options are filtered out; an empty group is hidden.
- Course source records, canonical IDs, topic relationships, course sorts and any member selections are unchanged.

## Source verification

2027–28 staged Primary catalog includes **184 top-level courses**:
- **151** shared `Both` country options
- **16** U.S.-specific options
- **17** Canada-specific options

Only **History, Geography, and Citizenship** currently have country-specific options. All four currently active Latin/Science choice groups use `Both` options.

The default unfiltered list still contains 184 canonical course options, while the filtered set contains 167 for U.S. and 168 for Canada (before any grade/subject/search filters). The app continues to suppress standalone duplicates of courses belonging to active choice groups.

## Future source compatibility

The reusable `matchesCountry(scope, selection)` helper works for newly imported courses:
- `All` → any country
- `U.S.` → `U.S.` or `Both`
- `Canada` → `Canada` or `Both`
- Unknown country → excluded from country-filtered views until the publisher supplies an explicit scope.

Future new Airtable courses still require the validated Airtable→Supabase→site publishing workflow before appearing in this static preview; no live catalog reads or RLS changes are involved.

## Acceptance checks

- Grade 7 + U.S. + Citizenship shows U.S. citizenship courses, not Canadian versions.
- Grade 7 + Canada + Citizenship shows Canadian courses, not U.S. versions.
- Grade 7 + Canada + Science still shows eligible shared-country Science choice groups.
- Switching from U.S. to Canada inside the Grade panel does **not** close it; clicking anywhere outside does.
- Country label remains visible in the Grade button after the panel closes, and **All** restores both countries.
- Existing nested-topic disclosures and independent scroll behavior are unaffected.
