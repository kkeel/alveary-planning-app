export type ArrangementValue = "Combined" | "Separate" | "Later" | "Both";
export type AssignmentArrangement = {
  courseId: string; studentId: string; topicId: string | null;
  arrangement: ArrangementValue;
};
export declare function courseArrangement(
  records: readonly AssignmentArrangement[],courseId:string,studentId:string
): ArrangementValue;
export declare function topicArrangementOverride(
  records: readonly AssignmentArrangement[],courseId:string,studentId:string,topicId:string
): ArrangementValue | "inherit";
export declare function effectiveArrangement(
  records: readonly AssignmentArrangement[],courseId:string,studentId:string,topicId?:string|null
): ArrangementValue;
