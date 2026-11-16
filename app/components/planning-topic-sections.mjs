import { topicIsThinkTankIdea } from "../courses/list-row-status.mjs";
import { topicHasAssignedStudent } from "./topic-assignment.mjs";

/** A catalog topic is still available when it is not selected here,
 * including topics intentionally excluded from this course. Exclusion,
 * Think Tank intent and student assignment are separate dimensions. */
export function thinkTankTopicSections(children, choice, students, excludedLocal = []) {
  const selected=[], other=[];
  for(const topic of children){
    const savedTopic=choice?.topics.find(t=>t.topicId===topic.id);
    const excluded=savedTopic ? !savedTopic.included : excludedLocal.includes(topic.id);
    const planned=Boolean(choice?.stage==="planned" &&
      savedTopic?.included && topicHasAssignedStudent(choice,topic.id,students));
    const idea=!excluded && (choice
      ? topicIsThinkTankIdea(choice,topic.id,students)
      : true);
    const entry={...topic,excluded,planned};
    if (idea) selected.push(entry);
    else other.push(entry);
  }
  return {selected,other};
}
/** Display counts only if part of a published combined course is selected.
 * Do NOT confuse the 'included' curriculum subset with topics assigned or
 * directly considered; the same course may appear in both columns. */
export function selectionTopicCount(choice, children, students, mode, excludedLocal = []) {
  if (!children.length) return {selected:0,total:0};
  if(!choice) return {
    selected:children.filter(t=>!excludedLocal.includes(t.id)).length,
    total:children.length,
  };
  const selected=children.filter(t=>
    mode==="think" ? topicIsThinkTankIdea(choice,t.id,students) :
      choice.stage==="planned" && topicHasAssignedStudent(choice,t.id,students)
  ).length;
  return {selected,total:children.length};
}
