/**
 * Effective assignment inside ONE saved parent course.
 * A course-student link assigns all included topics unless a per-topic
 * student exception overrides that link. Topic-only assignments never
 * imply that the student was assigned the rest of the combined course.
 */
export function isTopicAssigned(course, topicId, studentId) {
  const topic = course.topics.find(item => item.topicId === topicId && item.included);
  if (!topic) return false;
  const override = course.overrides.find(item =>
    item.topicId === topicId && item.studentId === studentId);
  return override ? override.assigned === true : course.studentIds.includes(studentId);
}

export function effectiveTopicCount(course, studentId) {
  return course.topics.reduce((total, topic) =>
    total + (isTopicAssigned(course, topic.topicId, studentId) ? 1 : 0), 0);
}

/** A topic enters My Plan when at least one student is assigned to it in
 * this parent; the remaining topics are still available in Think Tank. */
export function topicHasAssignedStudent(course, topicId, students) {
  return students.some(student => isTopicAssigned(course, topicId, student.id));
}

export function remainingTopicCount(course, students) {
  return course.topics.filter(topic => topic.included &&
    !topicHasAssignedStudent(course, topic.topicId, students)).length;
}

/** A saved Think Tank idea can still contain previously selected students
 * (for example after "Return to Think Tank"). Done must promote that choice
 * even if all its checkboxes were already checked when the editor opened.
 * Never infer a whole-course assignment from topic-only selections. */
export function shouldPromoteChoiceOnDone(course, topicId, students) {
  if (course.stage !== "idea") return false;
  if (topicId) return topicHasAssignedStudent(course, topicId, students);
  return students.some(student => course.studentIds.includes(student.id));
}
