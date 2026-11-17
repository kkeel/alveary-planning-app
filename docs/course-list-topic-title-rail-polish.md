# Course List choice headers, topic selection rails and Planning Desk spacing

**November 17, 2026 — UI polish for the next-year planning app only.**
No Airtable, Supabase, data model, assignment semantics, live year, or member
record changes in this patch.

## Course List choices

- Keep each choice group's **neutral heading and authored tag badges**.
- Remove the extra left/bottom outline around a choice group. Use the same
  thin row separator as the rest of the Course List when another group or an
  ordinary course (Latin 3, Latin 4) follows it.
- Existing course/edition grade filtering, one-record-per-course
  deduplication, search, links, and selection colors stay unchanged.

## Inherited versus directly selected topics

The status model is unchanged. `listRowStatus` distinguishes why a topic
has a colored button/heading:

| Source of selection | Course row | Topic rows |
| --- | --- | --- |
| Plan at course **+ All** | Full subject-color course rail | Light inherited header/buttons; **no topic rail** |
| Plan one or a few individual topics | Partial subject-color course rail | Selected topics have a **strong bar beside the topic heading only**, not down the long description; unselected siblings neutral |
| Think Tank at course lightbulb | Full idea marker at course heading | Included inherited ideas show a **soft short left rail** beside title and light header/buttons |
| Think Tank at individual topic lightbulb | Partial idea marker on course | Selected topic shows a **strong short left rail** beside title; unrelated siblings neutral |

The horizontal colored selection state continues to come from the existing
subject palette, and all student/idea selection reciprocity is preserved.
Short rails attach to `.cx-course-head`, not `.cx-course`, so descriptions
remain clean when details expand. The `cx-idea-tone-full/inherited` classes
are presentational only, derived from existing saved idea state.

## Planning Desk

- Increase mini/drawer subject-list inset from **6px to 12px** each side,
  including Think Tank and My Plan. Maintain the unboxed subject list and the
  colored left rail beside expanded Think Tank **details**, unchanged.
- Full Planning view already has its own 16px body padding and remains as-is.

## Browser acceptance

1. Open Grade 9 History, choose + All for a student: parent header/rail is
   strong; each included topic header and + control is pale but has **no
   vertical topic rail**, including in expanded descriptions.
2. Open History Grades 10–12 and assign only U.S. History and Ancient
   History topics: the parent shows its usual partial highlight and the
   selected topics show a **short colored stripe next to their titles**.
   World History remains neutral.
3. Toggle the History Grades 7–8 course lightbulb: included topic headings
   have a **soft, short rail** and lightly tinted heading, even when their
   descriptions are expanded. For a directly selected topic lightbulb, use the
   stronger short title rail. Unselected siblings remain neutral.
4. On Latin and Science choices, confirm the neutral heading/tag labels but
   **no additional surrounding group box or bracket**. Latin 3/4 remain
   ordinary ungrouped rows. Selecting a Latin course still produces the
   familiar subject-colored course selection rail.
5. In mini and drawer Planning Desk at large and narrow viewports, inspect
   the extra **12px inset** around subject highlights. Expanded Think Tank
   details continue to have their existing subject-colored vertical rail.
6. Check print preview, keyboard focus, quick View/Hide toggles, and the
   Grade 1–8-only versus mixed/all-grade Science group scenarios.

Automated regression: `tests/course-list-topic-title-rails.test.mjs`,
updated choice contrast and Planning Desk responsive tests.
