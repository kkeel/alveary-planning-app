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
| Plan one or a few individual topics | Partial subject-color course rail | Selected topics have a **strong full-height left rail** beside their entire expanded topic; unselected siblings neutral |
| Think Tank at course lightbulb | Full idea marker at course heading | Included inherited ideas show a **soft title-height rail** with no full-width title tint; buttons stay light |
| Think Tank at individual topic lightbulb | Partial idea marker on course | Selected topic shows a **medium title-height rail**, no full-width title tint; unrelated siblings neutral |

The horizontal colored selection state continues to come from the existing
subject palette, and all student/idea selection reciprocity is preserved.
Direct-plan rails attach to the complete `.cx-course` topic, including its description.
Think Tank-only rails attach to `.cx-course-head` and stop at the end of the title row. The `cx-idea-tone-full/inherited` classes
are presentational only, derived from existing saved idea state.

## Planning Desk

- Increase mini/drawer subject-list inset from **6px to 12px** each side,
  including Think Tank and My Plan. Maintain the unboxed subject list and the
  colored left rail beside expanded Think Tank **details**, unchanged.
- Full Planning view already has its own 16px body padding and remains as-is.

## November 17 follow-up: selected topic plan vs Think Tank

After reviewing the History Grades 10–12, Grade 9, Grades 7–8, and
Grades 5–6 screenshots, the selection styling is refined:

- **Directly planned topic:** restore the strong, saturated **full-topic-height**
  left rail, including when its metadata and description are expanded.
  Keep the parent's partial reciprocal highlight when only some topics
  are planned (History 10–12).
- **Parent course + All:** do not add an individual topic rail. All included
  topics remain softly tinted on their title row and + controls (History 9).
- **Think Tank, individual or inherited topic:** remove the tinted full-width
  topic title background and keep only a **medium/light** left rail along
  the complete *title-row height*, not down the long topic description.
  Direct topic idea uses medium; inherited course idea uses lighter. The
  parent idea remains as currently styled (History 7–8 and 5–6).
- Choice group headings keep their neutral fill and authored tags with no
  surrounding box, and now have a slightly clearer **2px muted gray-green
  bottom border**, even against a selected first option.
- Course List **subject and text search filters** now join existing grade
  and U.S./Canada preferences in the account-scoped Planning Desk
  localStorage state. They restore after navigating between app pages or
  returning to the Course List. The "Show all courses" reset clears all four
  filters. Public/unsigned sessions retain the existing no-storage behavior.

## Browser acceptance

1. Open Grade 9 History, choose + All for a student: parent header/rail is
   strong; each included topic header and + control is pale but has **no
   vertical topic rail**, including in expanded descriptions.
2. Open History Grades 10–12 and assign only U.S. History and Ancient
   History topics: the parent shows its usual partial highlight and the
   selected topics show a **strong full-height colored rail** extending past expanded descriptions.
   World History remains neutral.
3. Toggle the History Grades 7–8 course lightbulb: included topic headings
   have a **soft, full-title-height rail** without a full-width tinted heading,
   even when descriptions are expanded. For a directly selected topic lightbulb,
   use a medium rail that also ends at the bottom of its title row. Unselected siblings remain neutral.
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
