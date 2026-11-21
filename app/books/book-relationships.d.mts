export type ResourceUse = {
  assignmentId: string; editionId: string; role: string | null;
  optional: boolean; chooseOne: boolean; choiceCount: number;
  alternativeTitles?: string[];
  term1: string | null; term2: string | null; term3: string | null;
  gradeLevelTag?: string | null; additionalRationale?: string | null;
  displayOrder?: number | null; termSort?: number | null;
};
export type ResourceBook = {
  id: string; title: string; author: string | null; isbn: string | null;
  type: string | null; rationale: string | null; memberOnly: boolean;
  formats?: string | null; save?: boolean; print?: boolean;
  discount?: string | null; discountCode?: string | null; maySub?: string | null;
  links: {label: string; url: string}[]; uses: ResourceUse[];
  coursePaths?: string[]; sharedIn?: string[];
};
export declare function booksForEditions(bookCatalog: any, editionIds: string[]): ResourceBook[];
export declare function allBooks(bookCatalog: any): ResourceBook[];
export declare function editionIdsForFocus(courseCatalog:any,courseId:string,topicId?:string|null):string[];
export declare function booksForFocus(bookCatalog:any,courseCatalog:any,courseId:string,topicId?:string|null):ResourceBook[];
export declare function editionIdsForMyPlan(courseCatalog:any,savedCourses:any[],students:any[]):string[];
export declare function booksForMyPlan(bookCatalog:any,courseCatalog:any,savedCourses:any[],students:any[]):ResourceBook[];
export declare function bookNeededInTerm(book:ResourceBook,term:string):boolean;
export declare function bookTermSummary(book:ResourceBook):string;

export declare function noteExplainsMemberAccess(note:string | null | undefined):boolean;
