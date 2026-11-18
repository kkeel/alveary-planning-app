export type PriorityValue = "Core"|"High Interest"|"Additional"|"Not set";
export type SharedRow = {courseId:string;topicId:string|null;priority:PriorityValue};
export type StudentRow = SharedRow & {studentId:string};
export function sharedCoursePriority(items:readonly SharedRow[],courseId:string):PriorityValue|null;
export function sharedTopicOverride(items:readonly SharedRow[],courseId:string,topicId:string):PriorityValue|"inherit";
export function sharedTopicPriority(items:readonly SharedRow[],courseId:string,topicId:string):PriorityValue|null;
export function sharedCourseSummary(items:readonly SharedRow[],courseId:string,topicIds:readonly string[]):PriorityValue|"Varied"|null;
export function effectivePlanningPriority(shared:readonly SharedRow[],student:readonly StudentRow[],courseId:string,topicId:string|null,studentId:string):PriorityValue|null;
