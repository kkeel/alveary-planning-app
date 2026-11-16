export type CourseTopicMembership = {
  topics: readonly { topicId: string; included: boolean }[];
  studentIds: readonly string[];
  overrides: readonly { topicId: string; studentId: string; assigned: boolean }[];
};
export declare function isTopicAssigned(
  course: CourseTopicMembership, topicId: string, studentId: string
): boolean;
export declare function effectiveTopicCount(
  course: CourseTopicMembership, studentId: string
): number;
