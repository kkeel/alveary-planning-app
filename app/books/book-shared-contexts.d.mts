export declare function buildBookSharedContexts(
  bookCatalog: {assignments: Array<{editionId:string;resourceIds:string[]}>},
  courseCatalog: {
    courses: Array<{editionId:string;title:string;type:string}>;
    topicLinks: Array<{parentEditionId:string;childEditionId:string}>;
  }
): Map<string,string[]>;
