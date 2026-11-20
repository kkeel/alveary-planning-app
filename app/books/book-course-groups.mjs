import { topicHasAssignedStudent } from "../components/topic-assignment.mjs";
import { matchesCountry } from "../courses/country-filter.mjs";

/**
 * A curriculum-first PRESENTATION of existing book assignments.
 * The canonical resource record is never duplicated in storage; its row may
 * appear more than once, under the course/topic where a family expects it.
 *
 * In contrast to the alphabetical book view, term, country, grade, search,
 * and saved-topic filtering happen on the exact assignment/context FIRST.
 */
export function buildBookCourseGroups(bookCatalog,courseCatalog,options={}) {
  const {
    scope="all",savedCourses=[],students=[],subject="",grades=[],country="all",
    query="",term="all",focusCourseId=null,focusTopicId=null,
  }=options;
  const search=query.trim().toLocaleLowerCase();
  const byEdition=new Map(courseCatalog.courses.map(course=>[course.editionId,course]));
  const byId=new Map(courseCatalog.courses.map(course=>[course.id,course]));
  const resources=new Map(bookCatalog.resources.map(book=>[book.id,book]));
  const byEditionAssignment=new Map();
  for(const assignment of bookCatalog.assignments) {
    const existing=byEditionAssignment.get(assignment.editionId)??[];
    existing.push(assignment);
    byEditionAssignment.set(assignment.editionId,existing);
  }
  const linked=new Map();
  const childEditionIds=new Set();
  for(const link of courseCatalog.topicLinks) {
    const child=byEdition.get(link.childEditionId);
    if(!child)continue;
    childEditionIds.add(child.editionId);
    const entries=linked.get(link.parentEditionId)??[];
    if(!entries.some(item=>item.editionId===child.editionId))entries.push(child);
    linked.set(link.parentEditionId,entries);
  }

  const plannedById=new Map(savedCourses
    .filter(course=>course.stage==="planned")
    .map(course=>[course.courseId,course]));
  let roots;
  if(focusCourseId) {
    const found=byId.get(focusCourseId);
    roots=found?[found]:[];
  } else if(scope==="school") {
    roots=[...plannedById.keys()].map(id=>byId.get(id)).filter(Boolean);
  } else {
    roots=courseCatalog.courses.filter(course=>
      course.type!=="Topic" ||
      (!childEditionIds.has(course.editionId)&&
        byEditionAssignment.has(course.editionId)));
  }

  const sortCourse=(a,b)=>
    (a.presentationSort??a.sort??"").localeCompare(b.presentationSort??b.sort??"") ||
    a.title.localeCompare(b.title);
  const sections=new Map();
  const directFor=(editionId,contextMatches)=>{
    const bookRows=new Map();
    const candidates=(byEditionAssignment.get(editionId)??[])
      .filter(a=>term==="all"||Boolean(a["term"+term]))
      .sort((a,b)=>(a.sort??Number.MAX_SAFE_INTEGER)-
        (b.sort??Number.MAX_SAFE_INTEGER));
    for(const assignment of candidates) {
      for(const resourceId of assignment.resourceIds) {
        const resource=resources.get(resourceId);
        if(!resource)continue;
        const resourceMatches=[resource.title,resource.author,resource.isbn]
          .some(text=>String(text??"").toLocaleLowerCase().includes(search));
        if(search&&!contextMatches&&!resourceMatches)continue;
        let entry=bookRows.get(resourceId);
        if(!entry) {
          entry={...resource,uses:[],_sort:assignment.sort??Number.MAX_SAFE_INTEGER};
          bookRows.set(resourceId,entry);
        }
        entry.uses.push({
          assignmentId:assignment.id,editionId:assignment.editionId,
          role:assignment.role,optional:assignment.optional,
          chooseOne:assignment.chooseOne,choiceCount:assignment.resourceIds.length,
          term1:assignment.term1,term2:assignment.term2,term3:assignment.term3,
        });
      }
    }
    return [...bookRows.values()].sort((a,b)=>a._sort-b._sort ||
      a.title.localeCompare(b.title,undefined,{numeric:true}))
      .map(({_sort,...book})=>book);
  };

  let appearances=0;
  const seenIds=new Set();
  for(const root of roots.sort(sortCourse)) {
    // An explicit View Books deep link wins over remembered country/grade
    // browsing filters, but never alters them.
    if(!focusCourseId) {
      if(subject&&root.subject!==subject)continue;
      if(grades.length&&!root.grades.some(g=>grades.includes(g)))continue;
      if(!matchesCountry(root.country,country))continue;
    }

    const planned=plannedById.get(root.id);
    const rootMatch=[root.title,root.subject].some(value=>
      String(value??"").toLocaleLowerCase().includes(search));
    const allChildren=(linked.get(root.editionId)??[]).sort(sortCourse);
    const children=allChildren.filter(child=>{
      if(focusTopicId&&child.id!==focusTopicId)return false;
      if(scope!=="school"||focusCourseId)return true;
      return Boolean(planned?.topics?.some(topic=>
        topic.topicId===child.id && topic.included &&
        topicHasAssignedStudent(planned,topic.topicId,students)));
    });
    const focusedTopic=children.find(child=>child.id===focusTopicId);
    const directBooks=directFor(root.editionId,
      rootMatch||Boolean(focusedTopic?.title.toLocaleLowerCase().includes(search)));
    const topics=children.map(child=>({
      topic:child,
      books:directFor(child.editionId,
        rootMatch||child.title.toLocaleLowerCase().includes(search)),
    })).filter(group=>group.books.length);

    const count=directBooks.length+
      topics.reduce((total,group)=>total+group.books.length,0);
    if(!count)continue;
    appearances+=count;
    const allBooks=[...directBooks,...topics.flatMap(topic=>topic.books)];
    for(const book of allBooks)seenIds.add(book.id);
    const subjectName=root.subject||"Other";
    const list=sections.get(subjectName)??{
      subject:subjectName,subjectSort:root.subjectSort??99,courses:[],count:0,
    };
    list.courses.push({course:root,directBooks,topics,count});
    list.count+=count;
    sections.set(subjectName,list);
  }
  return {
    sections:[...sections.values()].sort((a,b)=>a.subjectSort-b.subjectSort ||
      a.subject.localeCompare(b.subject)),
    appearances,distinctResources:seenIds.size,
  };
}

/** By Book is a distinct resource perspective on the SAME filtered contexts.
 * Deduplicate the resource and its repeated source assignment IDs, never
 * silently merging the underlying curriculum use/term semantics. */
export function booksFromCourseGroups(grouped) {
  const resources=new Map();
  for(const section of grouped.sections)for(const course of section.courses) {
    const rows=[...course.directBooks,...course.topics.flatMap(t=>t.books)];
    for(const row of rows) {
      let item=resources.get(row.id);
      if(!item){item={...row,uses:[]};resources.set(row.id,item);}
      const ids=new Set(item.uses.map(use=>use.assignmentId));
      for(const use of row.uses)if(!ids.has(use.assignmentId)) {
        item.uses.push(use);ids.add(use.assignmentId);
      }
    }
  }
  return [...resources.values()].sort((a,b)=>
    a.title.localeCompare(b.title,undefined,{numeric:true}));
}
