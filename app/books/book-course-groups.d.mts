import type {ResourceBook} from "./book-relationships.mjs";

export type CourseContext = {
  id:string; editionId:string; title:string; subject:string; type:string;
  presentationSort?:string; subjectSort?:number; gradeDisplay?:string;
};
export type TopicBookGroup = {topic:CourseContext;books:ResourceBook[]};
export type CourseBookGroup = {
  course:CourseContext;directBooks:ResourceBook[];topics:TopicBookGroup[];count:number;
};
export type SubjectBookGroup = {
  subject:string;subjectSort:number;courses:CourseBookGroup[];count:number;
};
export type GroupedBookCourses = {
  sections:SubjectBookGroup[];appearances:number;distinctResources:number;
};
export declare function buildBookCourseGroups(bookCatalog:any,courseCatalog:any,options?:{
  scope?:"all"|"school";savedCourses?:any[];students?:any[];
  subject?:string;grades?:number[];country?:string;
  query?:string;term?:string;focusCourseId?:string|null;focusTopicId?:string|null;
}):GroupedBookCourses;
export declare function booksFromCourseGroups(grouped:GroupedBookCourses):ResourceBook[];
