# Planning Companion: welcoming entry and Course List handoff (v1)

Status: Agreed design direction, **not yet implemented** (except Detailed first-visit default for Explore / Course List).

## Purpose
Make Alveary planning feel manageable and encouraging. The Companion offers optional guidance based on the existing Course Planning and 2026–27 Planning Guides; it must never become a required setup wizard or a second Course List.

## First encounter
- Offer two prominent choices: **Help me think it through** and **Continue my planning**.
- A new member can choose Core, High Interest, or Additional Subjects guidance. The wording is illustrative and follows the guide's spirit; it must never auto-tag courses or require a priority to proceed.
- Returning members may go straight to My Plan; the Companion remains available separately.

## From guide to Course List
- **Browse courses with guidance** opens the normal member Course List (including its existing planning controls and mini Planning Desk), not the separate full-page Planning Desk.
- This matters in the current implementation: `desk.courseMode === "browse"` displays the Course List; `"plan"` displays the full two-column Planning Desk. A deep link must not call `setCourseMode("plan")` when it intends to show browsable courses.
- Open the Companion in the upper-right area of the Course List, on **the exact guide section the member was reading** (for example `priorities/additional`).
- Move the existing portable Planning Desk **down** in the right column so its top aligns roughly with the start of the course rows, below the Companion, instead of competing with the guidance box.
- Keep course filters, assignments, saved preferences and selection states untouched by guide navigation.

## Companion states
1. **Open**: section title and guidance are visible, alongside relevant links and a close/minimize action.
2. **Minimized**: a small persistent reopening control with the Companion identity; does not obstruct the Course List.
3. **Tip available**: minimized control takes on a subtle attention tint when a relevant contextual tip is waiting. No modal, auto-expansion, or repeated nagging. Opening marks the tip as seen.
4. **Closed**: member deliberately dismisses it, but can reopen it using a clearly labeled control near the right-column header. Distinguish close from minimize before final interaction coding.

Start with a tiny set of contextual tips, tied to meaningful events (for instance, considering many subjects, combined-course planning, choosing scheduling arrangement), rather than firing on every click. Do not claim that changing a view is a curriculum problem; do not silently change selections. If multiple tips are eligible, show at most one unobtrusive invitation at a time. Member should be able to dismiss or ignore.

## View default and persistence
- **Explore / Course List first-visit default: Detailed** (descriptions, recommendations and topics visible).
- **Think Tank and My Plan defaults: Expanded**, as before. They store their preferences independently.
- Every subsequent deliberate mode selection is remembered. Opening the Companion should not reset a member's List, Think Tank, or My Plan preferences.
- An existing member's stored List view remains authoritative even if that view was previously saved as Expanded; do not overwrite valid stored preferences.
- Route and section context should be preserved deliberately (prefer a small allowlisted section id with member-scoped state or deep-link support, not a full text payload).

## Layout and responsive behavior
- Large screens: Course List in the primary left area, Companion above portable Planning Desk in the right column.
- Align mini desk below the Companion near the beginning of the course list. Avoid adding a floating overlay on course rows.
- On smaller screens, use the existing drawer patterns and give Companion a clear nonintrusive way to open. Do not create two competing fixed panels.
- Accessibility: each state has meaningful aria labels, keyboard focus handling, and readable muted/attention contrast; no color-only meaning.

## Initial acceptance scenarios
1. New visitor opens Explore / Course List: Detailed. Existing signed-in member's previously selected Compact or Expanded remains unchanged.
2. Companion welcome > Choosing priorities > High Interest > Browse courses with guidance. Course List opens with guide still on High Interest; no separate full Planning Desk page.
3. Companion is minimized, a genuinely relevant tip becomes available, the control changes quietly; click to open exact tip and return to the prior guide section.
4. Closing Companion reclaims space in the right column; mini desk remains available, and existing assignment/button behavior is untouched.
5. Reload/navigate away and return: remembered mode settings stay independent; guide opening state and last relevant section follow the persistence decision made in implementation.

## First implementation slice after this spec
1. Shared Companion shell and guide-section state.
2. Context-preserving Course List handoff.
3. Right-column layout with mini desk below Companion.
4. Minimize/reopen and basic contextual-tip indicator.
5. Iterate on copy and responsive layout only after those behaviors work.

Reference source material: Course Planning Guide and 2026–27 Planning Guide from the member planning workflow.
