/** Arrangements are a student's course default plus optional topic overrides.
 * An absent topic record inherits the course; explicit Later overrides a
 * Combined or Separate default without changing other topics. */
export function courseArrangement(records, courseId, studentId) {
  return records.find(item => item.courseId === courseId &&
    item.studentId === studentId && item.topicId === null)?.arrangement ?? "Later";
}
export function topicArrangementOverride(records, courseId, studentId, topicId) {
  return records.find(item => item.courseId === courseId &&
    item.studentId === studentId && item.topicId === topicId)?.arrangement ?? "inherit";
}
export function effectiveArrangement(records, courseId, studentId, topicId = null) {
  const choice = topicId
    ? topicArrangementOverride(records, courseId, studentId, topicId)
    : "inherit";
  return choice === "inherit" ? courseArrangement(records,courseId,studentId) : choice;
}
