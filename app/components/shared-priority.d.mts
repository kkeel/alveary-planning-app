export type PriorityValue = "Core"|"High Interest"|"Additional"|"Not set";
export type EffectivePriorityValue = Exclude<PriorityValue,"Not set">;
export type SharedRow = {courseId:string;topicId:string|null;priority:PriorityValue};
export type StudentRow = SharedRow & {studentId:string};
export function sharedCoursePriority(items:readonly SharedRow[],courseId:string):PriorityValue|null;
export function sharedTopicOverride(items:readonly SharedRow[],courseId:string,topicId:string):PriorityValue|"inherit";
export function sharedTopicPriority(items:readonly SharedRow[],courseId:string,topicId:string):PriorityValue|null;
export function sharedCourseSummary(items:readonly SharedRow[],courseId:string,topicIds:readonly string[]):PriorityValue|"Varied"|null;
export function effectivePlanningPriority(shared:readonly SharedRow[],student:readonly StudentRow[],courseId:string,topicId:string|null,studentId:string):EffectivePriorityValue|null;

export function priorityRollup(values:readonly (PriorityValue|null)[]):EffectivePriorityValue|"Varied"|null;

type SavedPriorityCourse = {
 courseId:string; ideaAll:boolean; studentIds:string[];
 topics:{topicId:string;included:boolean;ideaChoice:string}[];
 overrides:{topicId:string;studentId:string;assigned:boolean}[];
};
export function topicPriorityRollup(shared:readonly SharedRow[],student:readonly StudentRow[],
 course:SavedPriorityCourse|undefined,people:readonly{id:string}[],topicId:string):EffectivePriorityValue|"Varied"|null|undefined;
export function coursePriorityRollup(shared:readonly SharedRow[],student:readonly StudentRow[],
 course:SavedPriorityCourse|undefined,people:readonly{id:string}[],selectedTopicIds?:readonly string[]):EffectivePriorityValue|"Varied"|null|undefined;
export function differingStudentTopicPriority(shared:readonly SharedRow[],student:readonly StudentRow[],
 courseId:string,topicId:string,studentId:string):EffectivePriorityValue|null|undefined;
