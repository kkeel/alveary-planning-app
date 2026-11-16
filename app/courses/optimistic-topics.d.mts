export type PreviewTopic = {
  topicId:string;topicEditionId:string;included:boolean;order:number;
  ideaChoice:"inherit";
};
export declare function previewTopicsForCourse(
  catalog: {
    courses: readonly {id:string;editionId:string;type:string}[];
    topicLinks: readonly {parentEditionId:string;childEditionId:string}[];
  }, courseId:string
):PreviewTopic[];
