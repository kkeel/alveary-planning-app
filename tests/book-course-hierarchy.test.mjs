import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  buildBookCourseGroups,booksFromCourseGroups,
} from "../app/books/book-course-groups.mjs";

const read=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url),"utf8"));
const courseCatalog=read("app/courses/catalog-preview.json");
const bookCatalog=read("app/books/catalog-resources-preview.json");
const courseTypes=Object.fromEntries(["Topic","Single-Topic Course","Combined Course"]
  .map(type=>[type,bookCatalog.assignments
    .filter(assignment=>courseCatalog.courses.some(course=>
      course.editionId===assignment.editionId && course.type===type)).length]));
assert.equal(courseTypes.Topic,261);
assert.equal(courseTypes["Single-Topic Course"],184);
assert.equal(courseTypes["Combined Course"],2);

const all=buildBookCourseGroups(bookCatalog,courseCatalog);
const alphabetical=booksFromCourseGroups(all);
assert.equal(alphabetical.length,345,"All actual catalog resources must remain discoverable");
assert.equal(all.distinctResources,345);
assert.ok(all.appearances>483,
  "Repeated topic contexts should display repeat book appearances in By Course");
assert.equal(alphabetical.filter(b=>b.memberOnly).length,43);
assert.ok(alphabetical.filter(b=>b.memberOnly).every(b=>b.links.length===0));
assert.ok(all.sections.some(s=>s.subject==="Art"));
const art=all.sections.find(s=>s.subject==="Art");
const art4=art.courses.find(c=>c.course.title==="Art: Level 4");
assert.ok(art4);
assert.equal(art4.topics.length,0,"Single-topic courses must not grow an invented Topic layer");
assert.ok(art4.directBooks.some(b=>b.title==="Drawing, Design, and Craft-Work"));
assert.ok(art4.directBooks.some(b=>b.title.startsWith("Brush Drawing as Applied")));
const bookId=art4.directBooks.find(b=>b.title==="Drawing, Design, and Craft-Work").id;
assert.ok(alphabetical.find(b=>b.id===bookId).uses.length>=art4.directBooks.find(b=>b.id===bookId).uses.length);

// Purpose-built example where the SAME book is used in both Term 1 and Term 3
// but only belongs to the second topic in Term 3. This must never bleed into
// the second topic's Term 1 shopping view.
const courses=[
  {id:"p1",editionId:"ep1",title:"Combined Alpha",type:"Combined Course",
    subject:"Science",subjectSort:1,grades:[4],country:"Both",presentationSort:"1"},
  {id:"p2",editionId:"ep2",title:"Combined Beta",type:"Combined Course",
    subject:"Science",subjectSort:1,grades:[4],country:"Both",presentationSort:"2"},
  {id:"t1",editionId:"et1",title:"Shared Topic",type:"Topic",
    subject:"Science",subjectSort:1,grades:[4],country:"Both",presentationSort:"1"},
  {id:"t2",editionId:"et2",title:"Second Topic",type:"Topic",
    subject:"Science",subjectSort:1,grades:[4],country:"Both",presentationSort:"2"},
  {id:"s1",editionId:"es1",title:"Art: Level 4",type:"Single-Topic Course",
    subject:"Art",subjectSort:2,grades:[4],country:"Both",presentationSort:"3"},
];
const fakeCourses={courses,topicLinks:[
  {parentEditionId:"ep1",childEditionId:"et1"},
  {parentEditionId:"ep2",childEditionId:"et1"},
  {parentEditionId:"ep1",childEditionId:"et2"},
]};
const makeBook=id=>({id,title:id,author:null,isbn:null,rationale:null,
  memberOnly:false,links:[]});
const fakeResources={resources:["bookA","bookB","bookC"].map(makeBook),
  assignments:[
    {id:"a1",editionId:"et1",resourceIds:["bookA"],term1:"Full Term",
      term2:null,term3:null,role:"Main",optional:false,chooseOne:false,sort:null},
    {id:"a2",editionId:"et2",resourceIds:["bookA"],term1:null,
      term2:null,term3:"Selections",role:"Main",optional:false,chooseOne:false,sort:null},
    {id:"a3",editionId:"et2",resourceIds:["bookB"],term1:"Full Term",
      term2:null,term3:null,role:"Main",optional:false,chooseOne:false,sort:null},
    {id:"a4",editionId:"es1",resourceIds:["bookC"],term1:null,
      term2:"Full Term",term3:null,role:"Main",optional:false,chooseOne:false,sort:null},
  ]};
const full=buildBookCourseGroups(fakeResources,fakeCourses);
assert.equal(full.appearances,5);
assert.equal(full.distinctResources,3);
assert.equal(full.sections.find(s=>s.subject==="Science").courses.length,2);
const alpha=full.sections.find(s=>s.subject==="Science")
  .courses.find(c=>c.course.id==="p1");
const beta=full.sections.find(s=>s.subject==="Science")
  .courses.find(c=>c.course.id==="p2");
assert.deepEqual(alpha.topics.map(t=>t.topic.id),["t1","t2"]);
assert.deepEqual(beta.topics.map(t=>t.topic.id),["t1"],
  "Shared topic should appear in each source parent course");
assert.deepEqual(booksFromCourseGroups(full).find(b=>b.id==="bookA")
  .uses.map(u=>u.assignmentId).sort(),["a1","a2"],
  "By Book deduplicates the resource, not the underlying assignments");
const t1=buildBookCourseGroups(fakeResources,fakeCourses,{term:"1"});
assert.equal(t1.appearances,3);
const alpha1=t1.sections.find(s=>s.subject==="Science")
  .courses.find(c=>c.course.id==="p1");
assert.deepEqual(alpha1.topics.find(t=>t.topic.id==="t2").books.map(b=>b.id),
  ["bookB"],"Term 3 book must not leak into its Term 1 topic");
assert.equal(t1.sections.find(s=>s.subject==="Art"),undefined);
const focus=buildBookCourseGroups(fakeResources,fakeCourses,{
  focusCourseId:"p1",focusTopicId:"t2",term:"1"
});
assert.deepEqual(focus.sections[0].courses[0].topics.map(t=>t.topic.id),["t2"]);
assert.deepEqual(booksFromCourseGroups(focus).map(b=>b.id),["bookB"]);
const topicSearch=buildBookCourseGroups(fakeResources,fakeCourses,{query:"Shared Topic"});
assert.equal(topicSearch.appearances,2);
assert.ok(topicSearch.sections[0].courses.every(c=>c.topics.every(t=>t.topic.id==="t1")));
const bookSearch=buildBookCourseGroups(fakeResources,fakeCourses,{query:"bookB"});
assert.equal(bookSearch.appearances,1);

// My Plan: a topic only enters if it is included AND assigned to a student
// through this specific parent course. Shared topics from other parents don't
// grant unrelated siblings or their recommendations.
const saved=[{courseId:"p1",stage:"planned",studentIds:[],
  topics:[{topicId:"t1",included:true},{topicId:"t2",included:true}],
  overrides:[{topicId:"t2",studentId:"child",assigned:true}]}];
const school=buildBookCourseGroups(fakeResources,fakeCourses,{
  scope:"school",savedCourses:saved,students:[{id:"child"}]
});
assert.equal(school.sections.length,1);
assert.deepEqual(school.sections[0].courses[0].topics.map(t=>t.topic.id),["t2"]);
assert.deepEqual(booksFromCourseGroups(school).map(b=>b.id).sort(),["bookA","bookB"]);
const idea=buildBookCourseGroups(fakeResources,fakeCourses,{
  scope:"school",savedCourses:[{...saved,stage:"idea"}],students:[{id:"child"}]
});
assert.equal(idea.appearances,0,"Think Tank possibilities must not enter My School Books");
assert.equal(buildBookCourseGroups(fakeResources,fakeCourses,{grades:[9]}).appearances,0);
assert.equal(buildBookCourseGroups(fakeResources,fakeCourses,{subject:"Art",term:"1"}).appearances,0);

const page=readFileSync(new URL("../app/books/page.tsx",import.meta.url),"utf8");
const desk=readFileSync(new URL("../app/components/PlanningDeskContext.tsx",import.meta.url),"utf8");
const markup=readFileSync(new URL("../app/books/BookCourseHierarchy.tsx",import.meta.url),"utf8");
assert.match(page,/Showing books from My Plan/);
assert.match(page,/By Course/);
assert.match(page,/By Book/);
assert.match(page,/booksFromCourseGroups/);
assert.match(page,/BookCourseHierarchy/);
assert.match(desk,/bookOrganize: saved\.bookOrganize === "book"/);
assert.match(markup,/className="bk-topic-group"/);
assert.match(markup,/showLocation=\{false\}/);
console.log("Book course/topic hierarchy: exact use/term filters, shared contexts, and unique By Book verified.");
