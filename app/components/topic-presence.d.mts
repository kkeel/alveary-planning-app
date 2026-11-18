export type PresenceUse = { courseId:string; location:"Think Tank"|"My Plan" };
export type PresenceTopic = {
  topicId:string; topicEditionId:string; included:boolean;
  ideaChoice:"inherit"|"on"|"off";
};
export type PresenceCourse = {
  courseId:string;stage:"idea"|"planned";ideaAll:boolean;
  topics:PresenceTopic[];studentIds:string[];
  overrides:{topicId:string;studentId:string;assigned:boolean}[];
};
export function buildTopicPresence(
  courses:readonly PresenceCourse[],students:readonly {id:string}[],
):Map<string,PresenceUse[]>;
export function otherTopicPresence(
  index:Map<string,PresenceUse[]>,editionId:string,parentId:string,
):PresenceUse[];
