export type SortedTopic = {
  id: string;
  title: string;
  sort: string;
};
export declare function sortTopicsForCourse<T extends SortedTopic>(
  parent: { subject: string },
  topics: readonly T[]
): T[];
