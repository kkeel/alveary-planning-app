export type ArrangementValue="Combined"|"Separate"|"Later"|"Both";
export type SharedArrangementValue="Combined"|"Separate"|"Later";
export type AssignmentArrangement={
  courseId:string;studentId:string;topicId:string|null;arrangement:ArrangementValue;
};
export type SharedArrangement={
  courseId:string;topicId:string|null;arrangement:SharedArrangementValue;
};
export declare function sharedCourseArrangement(
  shared:readonly SharedArrangement[],courseId:string,
):SharedArrangementValue|null;
export declare function sharedTopicArrangementOverride(
  shared:readonly SharedArrangement[],courseId:string,topicId:string,
):SharedArrangementValue|"inherit";
export declare function sharedTopicArrangement(
  shared:readonly SharedArrangement[],courseId:string,topicId:string,
):SharedArrangementValue|null;
export declare function sharedArrangementSummary(
  shared:readonly SharedArrangement[],courseId:string,topicIds:readonly string[],
):SharedArrangementValue|"Varied"|null;
export declare function courseArrangement(
  records:readonly AssignmentArrangement[],courseId:string,studentId:string,
  shared?:readonly SharedArrangement[],
):ArrangementValue;
export declare function topicArrangementOverride(
  records:readonly AssignmentArrangement[],courseId:string,studentId:string,topicId:string,
):ArrangementValue|"inherit";
export declare function effectiveArrangement(
  records:readonly AssignmentArrangement[],courseId:string,studentId:string,
  topicId?:string|null,shared?:readonly SharedArrangement[],
):ArrangementValue;
export declare function arrangementRollup(
  values:readonly (ArrangementValue|null)[],
):ArrangementValue|"Varied"|null;
