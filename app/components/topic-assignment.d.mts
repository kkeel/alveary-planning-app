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

export declare function topicHasAssignedStudent(
  course: CourseTopicMembership, topicId: string, students: readonly { id: string }[]
): boolean;
export declare function remainingTopicCount(
  course: CourseTopicMembership, students: readonly { id: string }[]
): number;

export declare function shouldPromoteChoiceOnDone(
  course: CourseTopicMembership & { stage: "idea" | "planned" },
  topicId: string | undefined,
  students: readonly { id: string }[]
): boolean;
