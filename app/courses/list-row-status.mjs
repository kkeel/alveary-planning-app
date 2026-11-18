import { topicHasAssignedStudent } from "../components/topic-assignment.mjs";

/** An included topic may be considered in Think Tank, planned for a student,
 * or untouched. These are different concepts: inclusion alone is NOT a
 * Think Tank selection. All lookups use this exact saved parent course. */
export function topicIsThinkTankIdea(course, topicId, students) {
  const topic=course.topics.find(t=>t.topicId===topicId && t.included);
  if (!topic || (course.stage==="planned" &&
    topicHasAssignedStudent(course,topicId,students))) return false;
  return topic.ideaChoice==="on" ||
    (topic.ideaChoice!=="off" && course.ideaAll!==false);
}
export function pendingIdeaCount(course,students) {
  return course.topics.filter(t=>t.included &&
    topicIsThinkTankIdea(course,t.topicId,students)).length;
}
export function listRowStatus(choice,students,topicId,combined,localIdea=false) {
  const eligible=students.filter(s=>s && s.id);
  const saved=Boolean(choice)||localIdea;
  const excluded=Boolean(choice && topicId &&
    choice.topics.some(t=>t.topicId===topicId && !t.included));
  const included=choice?.topics.filter(t=>t.included)??[];
  const assignedAtCourse=Boolean(choice?.stage==="planned" &&
    eligible.some(s=>choice.studentIds.includes(s.id)));
  const assignedForTopic=Boolean(choice?.stage==="planned" && topicId &&
    topicHasAssignedStudent(choice,topicId,eligible));
  const anyAssigned=Boolean(choice?.stage==="planned" && included.some(t=>
    topicHasAssignedStudent(choice,t.topicId,eligible)));
  const directForTopic=Boolean(choice && topicId && eligible.some(s=>
    choice.overrides.some(o=>o.topicId===topicId && o.studentId===s.id &&
      o.assigned) && topicHasAssignedStudent(choice,topicId,[s])));

  // Saturation records origin of selection, NOT how many topics happen to
  // be assigned. A +All course stays saturated; its included topics are pale.
  const planTone=choice?.stage!=="planned"?"none":topicId
    ? (!assignedForTopic?"none":assignedAtCourse?"inherited":
        directForTopic?"full":"inherited")
    : (!anyAssigned?"none":!combined||assignedAtCourse?"full":"partial");

  let ideaTone="none";
  if (!excluded && saved) {
    if (topicId) {
      if (!assignedForTopic) {
        const topic=choice?.topics.find(t=>t.topicId===topicId && t.included);
        if (topic?.ideaChoice==="on") ideaTone="full";
        else if ((choice?.ideaAll!==false || !choice && localIdea) &&
          topic?.ideaChoice!=="off") ideaTone="inherited";
      }
    } else if (!choice && localIdea) ideaTone="full";
    else if (choice && pendingIdeaCount(choice,eligible)>0)
      ideaTone=choice.ideaAll!==false?"full":"partial";
  }
  const planActive=planTone!=="none";
  const ideaActive=ideaTone!=="none";
  return {
    saved,excluded,ideaActive,ideaTone,planActive,planTone,
    contextTone:"none",anyAssigned,isPlanned:Boolean(choice?.stage==="planned"),
  };
}

/** Course-level lightbulb: fill missing eligible topic ideas before clearing a
 * fully selected idea. Topics already assigned in this parent My Plan context
 * do not count as pending Think Tank ideas, nor do excluded topics. */
export function nextCourseIdeaAll(course,students) {
  const eligible=course.topics.filter(topic=>topic.included &&
    !topicHasAssignedStudent(course,topic.topicId,students));
  const isIdea=topic=>topic.ideaChoice==="on" ||
    (topic.ideaChoice!=="off" && course.ideaAll);
  const incomplete=eligible.some(topic=>!isIdea(topic));
  const active=eligible.some(isIdea);
  return incomplete || !active;
}

/** Empty after the last Think Tank idea and last effective student is gone.
 * When true the parent must be deleted, so every excluded topic and saved
 * default is reset by ON DELETE CASCADE, rather than stored invisibly. */
export function isUnusedSavedCourse(course,students){
  return pendingIdeaCount(course,students)===0 &&
    !course.topics.some(topic=>topic.included &&
      topicHasAssignedStudent(course,topic.topicId,students));
}
