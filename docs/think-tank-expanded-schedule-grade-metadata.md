# Think Tank: expanded course schedule and grade metadata

**Scope:** 2027–28 planning UI, shared by the portable Planning Desk and
full Planning page. Published Alveary suggestions, not the household's
actual schedule; no changes to assignment or scheduling persistence.

## Confirmed display rules

- Keep the **collapsed course row** compact. Course schedule and grade
  recommendations are hidden until the member opens its title or ⓘ details,
  or uses the page's expanded detail mode.
- In the **expanded course heading**, show schedule and grade as muted
  secondary metadata immediately **below** the existing
  `N of M topics · Partial My Plan` status line, when that line exists.
  When absent, metadata directly follows the course title.
- Use published `schedules[].text` and `gradeDisplay` from
  `catalog-preview.json`, with the Course List's fallback grade wording.
  Show each distinct published schedule recommendation, not a calculated
  family-specific lesson load.
- Combined courses currently have **no parent-level schedule records**;
  show the parent's grade range, but do not aggregate or synthesize its
  component topic schedules.
- Nested **Topics** and **Other topics** keep their schedule and grade
  recommendations behind **their own title/info disclosures**. The
  expanded parent does not automatically expand each topic's metadata.
- A topic with scheduling or grade information but no prose description
  can still open its own details.
- Keep the existing topic lightbulb/checkmark-title hover group,
  independent toolbar hit targets, assignment editors, and details state.

## Manual acceptance checks

1. In the mini desk, collapse and expand **Art: Level 1**. Only expanded
   should show its published 2 times/week, 20 min, and grade recommendation;
   the schedule should appear beneath any topic-count/partial metadata.
2. Open **Language Study: Grade 7** with only Copywork in the Think Tank.
   Under `1 of 4 topics`, the expanded course heading shows `GRADE: 7`,
   **not** the Copywork 5 times/week schedule.
3. Expand the **Copywork: Grade 7** title or info icon; its own published
   5 times/week, 10 min recommendation and grade appear in topic details.
   Close Copywork; that information disappears while the parent remains
   expanded.
4. Repeat for a topic under **Other topics**, especially an already
   planned topic showing a checkbox. Its title-hover identity marker must
   still be grouped with its title.
5. Try desktop and narrow/mobile desk, plus the full Planning page's
   expanded and collapsed detail modes. Multiple published schedule rows
   should remain readable; metadata should wrap instead of overlapping
   title-row icons.
6. Check that clicking the parent info button still **does not
   automatically expand** the separate Description & tips section, and
   that adding/assigning a topic still works as before.

Static regression: `tests/think-tank-schedule-grade-meta.test.mjs`.
Run during prebuild; browser review required before merging.
