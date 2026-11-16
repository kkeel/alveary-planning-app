export type PriorityValue = "Core" | "High Interest" | "Additional";
export type TopicPriorityValue = PriorityValue | "Not set";
export type AssignmentPriority = {
  courseId: string; studentId: string; topicId: string | null;
  priority: TopicPriorityValue;
};
export declare function coursePriority(
  preferences: readonly AssignmentPriority[],courseId:string,studentId:string
): PriorityValue | null;
export declare function topicPriorityOverride(
  preferences: readonly AssignmentPriority[],courseId:string,studentId:string,topicId:string
): TopicPriorityValue | "inherit";
export declare function effectivePriority(
  preferences: readonly AssignmentPriority[],courseId:string,studentId:string,topicId?:string|null
): PriorityValue | null;
