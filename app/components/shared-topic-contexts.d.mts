export type SavedTopicContext = {
  courseId: string; topicId: string; stage: "idea" | "planned";
};
export declare function savedTopicContexts(courses: readonly {
  courseId: string; stage: "idea" | "planned";
  topics: readonly { topicId: string; topicEditionId: string; included: boolean }[];
}[], topicEditionId: string): SavedTopicContext[];
