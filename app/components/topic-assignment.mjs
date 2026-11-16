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
