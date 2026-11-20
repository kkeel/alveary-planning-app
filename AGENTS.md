# Alveary app contributor/design guardrails

This repository is the **2027–28 Alveary planning app**. Before making any page, UI, CSS, or design-system changes, read **[docs/alveary-design-system.md](docs/alveary-design-system.md)**. It contains the **owner-supplied approved Alveary core colors and subject palette** and records essential curriculum-content visibility rules.

## Rules for UI and CSS changes

1. **Use approved Alveary colors or transparency/mixes of them**. Do not invent near-match greens, tans, whites, or grays in new work. Subject colors are fixed by `app/courses/legacy-subject-colors.mjs`. The optional slate blue is a *candidate*, not permission for arbitrary use. Existing out-of-palette code is technical debt to review, not a new color precedent.
2. **Keep curriculum explanations visible**: do not hide default course descriptions, recommendations or meaningful writer-provided book rationales and member-facing notes just to make layouts more compact. An intentional Compact mode can reduce detail; first-visit browsing must make the guidance discoverable and prominent, preferably visible without extra clicks.
3. **Protect the Course List visual status language.** Saturated subject colors, lighter inherited/partial selections, independent hover targets, selection rails/subject headers, shared-topic cues, and accessible focus/contrast are established features. Do not globally change the Course List's white backgrounds or tint handling without comparing and approving the visual results across all states.
4. **Maintain functional differences between pages:** Course List for decisions; Book List for resource discovery; portable/full Planning Desk for organizing. Keep Book List Subject → Course → Topic context and the alternate By Book view; do not turn repeated curricular uses into repeated household purchases.
5. **Check responsive and accessibility behavior** on the full pages and mini Planning Desk when changing shared design CSS. Respect existing protected/private book-link rules.
6. **Keep changes reviewable.** Document exceptions to approved palette or existing status behavior, show before/after captures in visually significant PRs, and avoid mixing a broad palette migration with unrelated work.

Other useful references: `docs/planning-icon-button-rules.md`, `docs/subject-colored-disclosure-and-desk-headers.md`, `docs/quiet-subject-colored-course-list-actions.md`, and `docs/book-list-connected-planning-roadmap.md`. **If an older design note conflicts with the latest owner-supplied palette or the requirement for visible decision-making content, use `docs/alveary-design-system.md` and explicitly call out the conflict before changing application behavior.**

These instructions are guidance for future contributions; adding this file does **not** itself modify application styles, publishing rules, or saved member plans.
