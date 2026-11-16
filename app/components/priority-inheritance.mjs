/** Priorities are separate from assignment membership. A course-wide
 * default is keyed by (parent course, student, null topic). A topic row
 * overrides it, including explicit "Not set"; absence means inherit. */
export function coursePriority(preferences, courseId, studentId) {
  return preferences.find(p => p.courseId === courseId && p.studentId === studentId &&
    p.topicId === null)?.priority ?? null;
}
export function topicPriorityOverride(preferences, courseId, studentId, topicId) {
  return preferences.find(p => p.courseId === courseId && p.studentId === studentId &&
    p.topicId === topicId)?.priority ?? "inherit";
}
export function effectivePriority(preferences, courseId, studentId, topicId = null) {
  const value = topicId ? topicPriorityOverride(preferences,courseId,studentId,topicId)
    : "inherit";
  if (value !== "inherit") return value === "Not set" ? null : value;
  return coursePriority(preferences, courseId, studentId);
}
