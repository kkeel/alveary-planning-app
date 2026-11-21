import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {buildBookSharedContexts,buildBookSharedGroups} from "../app/books/book-shared-contexts.mjs";

const read=path=>JSON.parse(readFileSync(new URL("../"+path,import.meta.url),"utf8"));
const catalog=read("app/books/catalog-resources-preview.json");
const courses=read("app/courses/catalog-preview.json");
const locations=buildBookSharedContexts(catalog,courses);
assert.ok(locations.size>0);
assert.ok([...locations.values()].some(paths=>paths.length>1),
  "The current release contains books assigned in more than one context");
const displayGroups=buildBookSharedGroups(catalog,courses);
const ourWork=catalog.resources.find(book=>book.title==="Our Work: Grades 1-2");
assert.ok(ourWork);
assert.deepEqual(displayGroups.get(ourWork.id).map(group=>
  [group.subject,group.paths.length]),
  [["Music",6],["Picture Study",1],["Recitation",1]]);
assert.equal(displayGroups.get(ourWork.id)
  .reduce((count,group)=>count+group.paths.length,0),8);

// A shared child topic must enumerate its *actual* parent course locations.
const shared={courses:[
  {editionId:"parent-a",title:"Alpha Course",type:"Combined Course"},
  {editionId:"parent-b",title:"Beta Course",type:"Combined Course"},
  {editionId:"child",title:"Shared Topic",type:"Topic"},
  {editionId:"other",title:"Other Topic",type:"Single-Topic Course"}
],topicLinks:[
  {parentEditionId:"parent-a",childEditionId:"child"},
  {parentEditionId:"parent-b",childEditionId:"child"}
]};
const year1={assignments:[
  {editionId:"child",resourceIds:["common","only-topic"]},
  {editionId:"other",resourceIds:["common"]}
]};
assert.deepEqual(buildBookSharedContexts(year1,shared).get("common"),[
  "Alpha Course › Shared Topic",
  "Beta Course › Shared Topic",
  "Other Topic"
]);
assert.deepEqual(buildBookSharedContexts(year1,shared).get("only-topic"),[
  "Alpha Course › Shared Topic",
  "Beta Course › Shared Topic"
]);
// When Next becomes Current, each immutable year's publisher invokes the same
// function against THAT release. No remembered current/next formula or carryover.
const year2={assignments:[{editionId:"other",resourceIds:["common"]}]};
assert.deepEqual(buildBookSharedContexts(year2,shared).get("common"),[
  "Other Topic"
]);
assert.equal(buildBookSharedContexts(year2,shared).has("only-topic"),false);
assert.equal(buildBookSharedGroups(year2,shared).has("only-topic"),false);
assert.equal(buildBookSharedGroups(year1,shared).get("only-topic")
  .reduce((count,group)=>count+group.paths.length,0),2);
// No title-based join or guessed courses when an edition is missing.
assert.equal(buildBookSharedContexts({
  assignments:[{editionId:"nonexistent",resourceIds:["common"]}]
},shared).size,0);

const row=readFileSync(new URL("../app/books/BookResourceRow.tsx",import.meta.url),"utf8");
const page=readFileSync(new URL("../app/books/page.tsx",import.meta.url),"utf8");
const mini=readFileSync(new URL("../app/books/BookPlanningContent.tsx",import.meta.url),"utf8");
assert.match(row,/const sharedPaths=book\.sharedIn\?\?\[\]/);
assert.match(row,/const showShared=sharedPaths\.length>1/);
assert.match(page,/memberView=\{signedIn\}/);
assert.match(mini,/memberView=\{status==="signed-in"\}/);
assert.match(row,/book\.memberOnly \? \[\] : book\.links/,
  "The public bundle must continue to withhold member-only URLs");
console.log("Release-scoped Shared locations, member presentation and public URL safeguards passed.");
