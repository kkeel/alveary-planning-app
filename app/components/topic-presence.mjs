import { isTopicAssigned } from "./topic-assignment.mjs";
import { topicIsThinkTankIdea } from "../courses/list-row-status.mjs";

/** Source-edition awareness across saved parents. Only a *selected* idea or
 * assigned topic counts; merely including a published topic is not enough.
 * This index is read-only and never changes any parent assignments. */
export function buildTopicPresence(courses,students) {
  const index=new Map();
  for (const course of courses) {
    for (const topic of course.topics) {
      if (!topic.included) continue;
      const planned=course.stage==="planned" &&
        students.some(student=>isTopicAssigned(course,topic.topicId,student.id));
      const idea=topicIsThinkTankIdea(course,topic.topicId,students);
      const location=planned?"My Plan":idea?"Think Tank":null;
      if (!location) continue;
      const uses=index.get(topic.topicEditionId)??[];
      uses.push({courseId:course.courseId,location});
      index.set(topic.topicEditionId,uses);
    }
  }
  return index;
}
export function otherTopicPresence(index,editionId,parentId) {
  return (index.get(editionId)??[]).filter(use=>use.courseId!==parentId);
}
