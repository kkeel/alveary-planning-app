export type ListPlanType = "Topic" | "Single-Topic Course" | "Combined Course";
/** Type guard: a true result guarantees the parent course exists. */
export declare function canOpenListStudentEditor<T extends {topics: readonly unknown[]}>(
  choice: T | null | undefined,
  courseType: ListPlanType,
  nested?: boolean,
): choice is T;
