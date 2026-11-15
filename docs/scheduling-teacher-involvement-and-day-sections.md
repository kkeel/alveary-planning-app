# Scheduling decisions — teacher attention and time of day (design direction)

**Status: proposed for a future Schedule Builder implementation; NOT yet an active planning setting.**
This is informed by the earlier Afternoon Work implementation plan, which specified
morning and afternoon zones within the same day columns, movable lesson cards,
suggested placement markers, and scheduling-board state as the source of truth.

## Keep course selection light
My Plan should answer **what to teach, to whom, and if appropriate how students are grouped**
(Combined / Separate / Later). It should not require all teacher-attention or time-of-day
choices before a course is added. Priority remains optional.

As of this refinement, **Both** is removed from the Arrangement options in the browser;
the existing data/API schema is left intact to avoid rewriting historical choices.
The current Demo data was checked and contains no saved Both values.

## Schedule-level choices (to build later)

1. **Teacher involvement**, deliberately chosen for the student and planned topic:
   - **Independent**: student works largely on their own
   - **With Help**: student works partly independently with teacher check-ins
   - **Teacher-Led**: teacher leads the lesson
2. Show the curriculum's **Teacher Attention suggestion** beside the choice as guidance,
   never as a mandatory rule or a substitute for the parent's decision.
3. **Time-of-day section**: Morning or Afternoon. Use the existing curriculum
   placement recommendation as a proposed default, but allow the family to change
   it. Keep morning and afternoon zones on the schedule board, with drag-and-drop
   movements overriding the suggestion.
4. Schedule records ultimately need to identify **year plan, student, topic edition,
   lesson/occurrence, section (morning/afternoon), chosen involvement**, and
   any per-instance override, while retaining combined course provenance.
   This prevents family-wide course assignments from making all children share
   an unwanted scheduling choice.
5. Where the same topic is used by more than one student or course group,
   allow a shared teaching session OR individual student sessions as
   explicit choices; do not silently duplicate work or schedules.
6. Set choices at the useful scheduling granularity: start with
   **student + topic** defaults, permit per-session/per-lesson override
   when the family's actual day differs. Do not impose this entire form in
   the Think Tank or My Plan.

## Quality goals
- Calm collapsed summaries and progressively disclosed scheduling choices.
- Fast optimistic updates, no layout jumps, reliable private persistence.
- Recommendations visible at the moment they're useful; user overrides are retained.
- Morning/Afternoon totals are derived from actual board placement, not independently
  incremented counters (per the existing Afternoon Work plan).
- Do not implement an attention/status field merely because a choice is described here:
  finalize semantics with the real scheduling interface and downstream PDF/Syllabird needs.
