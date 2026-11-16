export type TopicChoice = {
 topicId:string;included:boolean;ideaChoice?:"inherit"|"on"|"off"
};
export type ContextCourse={
 stage:"idea"|"planned";ideaAll?:boolean;studentIds:string[];
 overrides:{topicId:string;studentId:string;assigned:boolean}[];
 topics:TopicChoice[];
};
export type ContextTopic={id:string};
export declare function thinkTankTopicSections<T extends ContextTopic>(
 children:readonly T[],choice:ContextCourse|undefined,
 students:readonly{id:string}[],excludedLocal?:readonly string[]
):{selected:(T&{excluded:boolean;planned:boolean})[];
 other:(T&{excluded:boolean;planned:boolean})[]};
export declare function selectionTopicCount(
 choice:ContextCourse|undefined,
 children:readonly{id:string}[],students:readonly{id:string}[],
 mode:"think"|"plan",excludedLocal?:readonly string[]
):{selected:number;total:number};
