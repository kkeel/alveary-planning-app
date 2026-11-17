/**
 * One open Think Tank course across ALL subjects, never an independent
 * disclosure flag per row. Clicking the same course collapses it.
 */
export function toggleThinkCourse(currentId, clickedId) {
  return currentId === clickedId ? null : clickedId;
}

/** Honor a persisted full-page Expanded preference without expanding all.
 * An explicit null means the person intentionally closed the last course.
 * The portable desk starts closed, even when the full-page preference is on.
 */
export function resolveThinkCourse(currentId, variant, detailMode, firstCourseId) {
  if (currentId !== undefined) return currentId;
  return variant === "full" && detailMode === "expanded" ? firstCourseId ?? null : null;
}
