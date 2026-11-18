import { isTopicAssigned } from "./topic-assignment.mjs";

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
  const fallback = sharedCoursePriority(shared, courseId);
  return fallback === "Not set" ? null : fallback;
}

/** Read-only summary of the actual priorities used by selected students/topics.
 * Never writes back to the shared course/topic defaults. A mixture of a blank
 * with a priority is also Varied. */
export function priorityRollup(values) {
  if (!values.length) return null;
  const distinct = new Set(values.map(value=>value === "Not set" ? null : value ?? null));
  return distinct.size > 1 ? "Varied" : [...distinct][0];
}

/** One effective-priority read model for Course List and My Plan.
 * Student-specific choices are included without mutating shared defaults.
 * Unassigned saved ideas continue to display their shared selected-topic
 * priorities, while a planned course reflects actual assigned students. */
export function topicPriorityRollup(shared, assignmentPriorities, savedCourse, students, topicId) {
  if (!savedCourse) return undefined;
  const assigned = students.filter(student =>
    isTopicAssigned(savedCourse,topicId,student.id));
  if (!assigned.length) return sharedTopicPriority(shared,savedCourse.courseId,topicId);
  return priorityRollup(assigned.map(student =>
    effectivePlanningPriority(shared,assignmentPriorities,
      savedCourse.courseId,topicId,student.id)));
}
export function coursePriorityRollup(shared, assignmentPriorities, savedCourse, students, selectedTopicIds = []) {
  if (!savedCourse) return undefined;
  const actual = savedCourse.topics.filter(topic=>topic.included)
    .flatMap(topic=>students.filter(student=>
      isTopicAssigned(savedCourse,topic.topicId,student.id))
      .map(student=>effectivePlanningPriority(shared,assignmentPriorities,
        savedCourse.courseId,topic.topicId,student.id)));
  if (!actual.length) {
    for(const student of students){
      if(savedCourse.studentIds.includes(student.id))
        actual.push(effectivePlanningPriority(shared,assignmentPriorities,
          savedCourse.courseId,null,student.id));
    }
  }
  if (actual.length) return priorityRollup(actual);
  const topics = selectedTopicIds.length ? selectedTopicIds :
    savedCourse.topics.filter(topic=>topic.included &&
      (topic.ideaChoice==="on" || (topic.ideaChoice!=="off" && savedCourse.ideaAll)))
      .map(topic=>topic.topicId);
  return sharedCourseSummary(shared,savedCourse.courseId,topics);
}
/** Show a dot only when the student's *effective* topic priority actually
 * differs from the shared topic value, regardless of inherited student
 * course preferences or explicit same-value overrides. */
export function differingStudentTopicPriority(shared, assignmentPriorities, courseId, topicId, studentId) {
  const base=sharedTopicPriority(shared,courseId,topicId);
  const actual=effectivePlanningPriority(shared,assignmentPriorities,courseId,topicId,studentId);
  return actual===base ? undefined : actual;
}
