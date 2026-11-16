export type ListPlanType = "Topic" | "Single-Topic Course" | "Combined Course";
export declare function canOpenListStudentEditor(
  choice: { topics: readonly unknown[] } | null | undefined,
  courseType: ListPlanType,
  nested?: boolean,
): boolean;
