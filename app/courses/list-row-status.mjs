import { topicHasAssignedStudent, effectiveTopicCount } from "../components/topic-assignment.mjs";
/** Subject-colored selection state for the member catalog. Selection in
 * another combined course must never bleed into this parent context.
 * 'full' denotes the direct +All course assignment; 'partial' denotes a
 * parent planned through some but not all child topics.
 * 'inherited' is a child effectively assigned through +All. */
export function listRowStatus(choice, students, topicId, combined, localIdea=false) {
  const saved = Boolean(choice) || localIdea;
  const eligible = students.filter(student=>student && student.id);
  const isIdea = choice ? choice.stage === "idea" : localIdea;
  const isPlanned = choice?.stage === "planned";
  const excluded = Boolean(choice && topicId &&
    choice.topics.some(topic=>topic.topicId===topicId && !topic.included));
  const included = choice?.topics.filter(topic=>topic.included) ?? [];
  const anyAssigned = Boolean(choice && eligible.some(student=>
    effectiveTopicCount(choice,student.id)>0));
  const assignedForTopic = Boolean(choice && topicId &&
    topicHasAssignedStudent(choice,topicId,eligible));
  const assignedAtCourse = Boolean(choice && eligible.some(student=>
    choice.studentIds.includes(student.id)));
  const directForTopic = Boolean(choice && topicId && eligible.some(student=>
    choice.overrides.some(o=>o.topicId===topicId &&
      o.studentId===student.id && o.assigned) &&
    topicHasAssignedStudent(choice,topicId,[student])));
  const allIncludedAssigned = Boolean(choice && included.length &&
    included.every(topic=>eligible.some(student=>
      topicHasAssignedStudent(choice,topic.topicId,[student]))));
  const planTone = !isPlanned ? "none" : topicId
    ? (!assignedForTopic ? "none" : directForTopic ? "full" : "inherited")
    : (!anyAssigned ? "none" : !combined || assignedAtCourse || allIncludedAssigned
      ? "full" : "partial");
  const planActive = planTone !== "none";
  const ideaActive = !excluded && saved && !planActive &&
    (!isPlanned || Boolean(topicId));
  const contextTone = topicId
    ? (isPlanned && assignedAtCourse ? "inherited" : isIdea ? "inherited" : "none")
    : "none";
  return { saved, excluded, ideaActive, planActive, planTone, contextTone,
    anyAssigned, isPlanned: Boolean(isPlanned) };
}
