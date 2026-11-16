/** The student picker is allowed to open from the optimistic saved parent
 * as soon as + Plan is clicked for a single-topic course. Its identity is
 * already unambiguous, so it needn't wait for the server's topic-link snapshot.
 *
 * Nested and combined topics still require hydrated source topic links to
 * preserve their exact saved parent-course provenance. Mutations are queued:
 * prepare_plan is submitted before any student assignment. */
export function canOpenListStudentEditor(choice, courseType, nested = false) {
  if (!choice) return false;
  if (!nested && courseType === "Single-Topic Course") return true;
  return Array.isArray(choice.topics) && choice.topics.length > 0;
}
