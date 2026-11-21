export declare function buildBookSharedContexts(
  bookCatalog: {assignments: Array<{editionId:string;resourceIds:string[]}>},
  courseCatalog: {
    courses: Array<{editionId:string;title:string;type:string}>;
    topicLinks: Array<{parentEditionId:string;childEditionId:string}>;
  }
): Map<string,string[]>;

export declare function buildBookSharedGroups(
  bookCatalog: {assignments: Array<{editionId:string;resourceIds:string[]}>},
  courseCatalog: {
    courses: Array<{editionId:string;title:string;subject?:string;type:string}>;
    topicLinks: Array<{parentEditionId:string;childEditionId:string}>;
  }
): Map<string,Array<{subject:string;paths:string[]}>>;
