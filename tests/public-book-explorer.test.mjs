import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {allBooks,booksForFocus,booksForMyPlan,bookNeededInTerm,editionIdsForFocus} from "../app/books/book-relationships.mjs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const catalog=JSON.parse(read("app/books/catalog-resources-preview.json"));
const courses=JSON.parse(read("app/courses/catalog-preview.json"));

assert.equal(catalog.resources.length,345);
assert.equal(catalog.assignments.length,447);
assert.equal(catalog.assignments.reduce((n,a)=>n+a.resourceIds.length,0),483);
assert.equal(catalog.resources.filter(r=>r.memberOnly).length,43);
assert.ok(catalog.resources.filter(r=>r.memberOnly).every(r=>r.links.length===0),
  "Member-only resource titles remain in public preview but external URLs are excluded");
assert.equal(catalog.resources.reduce((n,r)=>n+r.links.length,0),511,
  "Only allowed HTTPS links from nonrestricted resources may be exported");

for(const resource of catalog.resources) {
  assert.ok(resource.id && resource.title);
  assert.ok(!Object.hasOwn(resource,"notes"),"Internal source notes must not leak");
  assert.ok(!Object.hasOwn(resource,"delay_live_link"),"Do not expose internal publisher flags");
  for(const link of resource.links) {
    assert.match(link.url,/^https:\/\//);
    assert.ok(!resource.memberOnly,"No external link for a member-only resource");
  }
}
const courseIds=new Set(courses.courses.map(c=>c.editionId));
const resourceIds=new Set(catalog.resources.map(r=>r.id));
for(const assignment of catalog.assignments) {
  assert.ok(courseIds.has(assignment.editionId),
    "All published assignments must match 2027–28 course editions");
  assert.ok(assignment.resourceIds.length>0);
  assert.ok(assignment.resourceIds.every(id=>resourceIds.has(id)));
}
assert.equal(catalog.assignments.filter(a=>a.chooseOne).length,19);
assert.ok(catalog.assignments.some(a=>a.resourceIds.length>1),
  "A source assignment can offer multiple, not automatically mandatory, alternatives");
const all=allBooks(catalog);
assert.equal(all.length,345);
assert.ok(all.some(b=>b.memberOnly),"Member-only resources must still be findable");

const byEdition=new Map(courses.courses.map(c=>[c.editionId,c]));
const combined=courses.courses.find(c=>c.type==="Combined Course" &&
  courses.topicLinks.some(l=>l.parentEditionId===c.editionId &&
    catalog.assignments.some(a=>a.editionId===l.childEditionId)));
assert.ok(combined,"Need a combined course with at least one assigned topic resource");
const childLinks=courses.topicLinks.filter(l=>l.parentEditionId===combined.editionId);
const topicLink=childLinks.find(l=>catalog.assignments.some(a=>a.editionId===l.childEditionId));
const topic=byEdition.get(topicLink.childEditionId);
assert.ok(topic);
const parentFocus=booksForFocus(catalog,courses,combined.id);
const topicFocus=booksForFocus(catalog,courses,combined.id,topic.id);
assert.ok(parentFocus.length>=topicFocus.length);
assert.ok(topicFocus.length>0);
assert.deepEqual(editionIdsForFocus(courses,combined.id,topic.id),
  [combined.editionId,topic.editionId]);
assert.deepEqual(editionIdsForFocus(courses,combined.id,"invalid-topic"),[]);
const sourceBook=topicFocus[0];
assert.ok(sourceBook.uses.some(u=>u.editionId===combined.editionId||
  u.editionId===topic.editionId));

// A saved course may have some topics planned and other topics only as ideas.
// Excluded/unassigned sibling topics must never appear as planned uses.
const saved={
  courseId:combined.id, stage:"planned", ideaAll:true,
  topics:childLinks.map((l,i)=>({
    topicId:byEdition.get(l.childEditionId).id,
    topicEditionId:l.childEditionId,
    included:true, order:i+1,ideaChoice:"inherit"
  })),
  studentIds:[],overrides:[{topicId:topic.id,studentId:"student1",assigned:true}]
};
const school=booksForMyPlan(catalog,courses,[saved],[{id:"student1"}]);
const actual=new Set(school.flatMap(b=>b.uses.map(u=>u.editionId)));
if(catalog.assignments.some(a=>a.editionId===combined.editionId))
  assert.ok(actual.has(combined.editionId));
assert.ok(actual.has(topic.editionId));
for(const link of childLinks) if(link.childEditionId!==topic.editionId)
  assert.ok(!actual.has(link.childEditionId),"Unassigned sibling topic leaked into My School Books");
assert.equal(booksForMyPlan(catalog,courses,[{...saved,stage:"idea"}],[{id:"student1"}]).length,0,
  "Think Tank ideas must not become school purchasing commitments");
assert.ok(all.some(book=>bookNeededInTerm(book,"1")));
assert.ok(!all.some(book=>book.uses.length===0));

const bookRow=read("app/books/BookResourceRow.tsx");
assert.match(bookRow,/book\.memberOnly \? \[\] : book\.links/);
assert.match(bookRow,/Resource available to Alveary members only/);
const page=read("app/books/page.tsx");
assert.match(page,/buildBookCourseGroups\(resources,courses/);
assert.match(page,/publicDensity/);
assert.match(page,/"detailed"\);/);
assert.doesNotMatch(page,/bk-organize-switch|By Book/);
assert.match(page,/BookCourseHierarchy/);
assert.match(page,/All Books/);
const mini=read("app/books/BookPlanningContent.tsx");
assert.match(mini,/booksForMyPlan/);
assert.match(mini,/desk\.bookTerm/);
console.log("Public Book Explorer: 345 visible titles, member-only link stripping and course contexts verified.");
