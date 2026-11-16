export type ListRowTone = "none" | "full" | "partial" | "inherited";
export declare function listRowStatus(choice: {
  stage:"idea"|"planned";
  studentIds: string[];
  overrides: {topicId:string;studentId:string;assigned:boolean}[];
  topics:{topicId:string;included:boolean}[];
} | undefined, students:readonly {id:string}[],topicId:string|null,
combined:boolean,localIdea?:boolean):{
  saved:boolean;ideaActive:boolean;planActive:boolean;planTone:ListRowTone;
  contextTone:ListRowTone;anyAssigned:boolean;isPlanned:boolean;
};
