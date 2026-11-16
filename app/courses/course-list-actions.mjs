/** Preserve a combined course as the saved parent when the member acts on
 * a topic within that course. The same topic can occur in multiple parents,
 * so the parent context must be explicit in every List action. */
export function sourceChoiceForRow(courseId, parentCourseId = null) {
  return { courseId: parentCourseId ?? courseId, topicId: parentCourseId ? courseId : null };
}
