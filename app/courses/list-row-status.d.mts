export type ListRowTone="none"|"full"|"partial"|"inherited";
export type TopicIdeaCourse={
  courseId:string;stage:"idea"|"planned";ideaAll?:boolean;
  studentIds:string[];
  overrides:{topicId:string;studentId:string;assigned:boolean}[];
  topics:{topicId:string;included:boolean;ideaChoice?:"inherit"|"on"|"off"}[];
};
export declare function topicIsThinkTankIdea(
 course:TopicIdeaCourse,topicId:string,students:readonly{id:string}[]):boolean;
export declare function pendingIdeaCount(
 course:TopicIdeaCourse,students:readonly{id:string}[]):number;
export declare function listRowStatus(
 choice:TopicIdeaCourse|undefined,students:readonly{id:string}[],
 topicId:string|null,combined:boolean,localIdea?:boolean
):{
 saved:boolean;excluded:boolean;ideaActive:boolean;ideaTone:ListRowTone;
 planActive:boolean;planTone:ListRowTone;contextTone:ListRowTone;
 anyAssigned:boolean;isPlanned:boolean;
};

export function nextCourseIdeaAll(course:{
 ideaAll:boolean;topics:readonly {topicId:string;included:boolean;ideaChoice:"inherit"|"on"|"off"}[];
 studentIds:readonly string[];overrides:readonly {topicId:string;studentId:string;assigned:boolean}[];
},students:readonly {id:string}[]):boolean;
