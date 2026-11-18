/** Shared priority defaults are independent of both student assignments and idea stage.
 * A course default applies to all topics without an explicit topic override.
 * A topic can explicitly opt out via "Not set". Summary never mutates defaults. */
export function sharedCoursePriority(items, courseId) {
  return items.find(p => p.courseId === courseId && p.topicId === null)?.priority ?? null;
}
export function sharedTopicOverride(items, courseId, topicId) {
  return items.find(p => p.courseId === courseId && p.topicId === topicId)?.priority ?? "inherit";
}
export function sharedTopicPriority(items, courseId, topicId) {
  const override = sharedTopicOverride(items, courseId, topicId);
  if (override !== "inherit") return override === "Not set" ? null : override;
  return sharedCoursePriority(items, courseId);
}
/** topicIds is the *visible selected* set: excluded and unchosen topics
 * must never affect the parent heading summary. */
export function sharedCourseSummary(items, courseId, topicIds) {
  if (!topicIds.length) return null;
  const seen = new Set(topicIds.map(id => sharedTopicPriority(items, courseId, id)));
  if (seen.size > 1) return "Varied";
  return [...seen][0] ?? null;
}
/** Per-student topic override > shared topic override > per-student course
 * override > shared course default. "Not set" is an explicit blank. */
export function effectivePlanningPriority(shared, student, courseId, topicId, studentId) {
  const topicStudent = student.find(p => p.courseId === courseId &&
    p.topicId === topicId && p.studentId === studentId);
  if (topicStudent) return topicStudent.priority === "Not set" ? null : topicStudent.priority;
  const sharedTopic = topicId === null ? "inherit" : sharedTopicOverride(shared,courseId,topicId);
  if (sharedTopic !== "inherit") return sharedTopic === "Not set" ? null : sharedTopic;
  const courseStudent = student.find(p => p.courseId === courseId &&
    p.topicId === null && p.studentId === studentId);
  if (courseStudent) return courseStudent.priority === "Not set" ? null : courseStudent.priority;
  return sharedCoursePriority(shared, courseId);
}
