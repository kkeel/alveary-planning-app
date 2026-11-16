import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  thinkTankTopicSections, selectionTopicCount,
} from "../app/components/planning-topic-sections.mjs";

const catalog=JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json",import.meta.url),"utf8"));
const byTitle=new Map(catalog.courses.map(c=>[c.title,c]));
const byEdition=new Map(catalog.courses.map(c=>[c.editionId,c]));
const g9=byTitle.get("History: Grade 9 (U.S.)");
const g1012=byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(g9 && g1012);
const childrenFor=parent=>catalog.topicLinks.filter(t=>
  t.parentEditionId===parent.editionId).map(t=>byEdition.get(t.childEditionId));
const topics=childrenFor(g9);
assert.equal(topics.length,3);
const people=[{id:"AJ"},{id:"Troy"}];
const choice=(parent,ideaAll=false)=>({
 courseId:parent.id,stage:"idea",ideaAll,studentIds:[],overrides:[],
 topics:childrenFor(parent).map(t=>({
  topicId:t.id,topicEditionId:t.editionId,included:true,ideaChoice:"inherit",
 })),
});
const one=choice(g9);
const shared=topics.find(topic=>childrenFor(g1012).some(t=>t.editionId===topic.editionId));
assert.ok(shared);

// A whole-course lightbulb includes all published topics; no Other topics.
const all=choice(g9,true);
assert.equal(thinkTankTopicSections(topics,all,people).selected.length,3);
assert.equal(thinkTankTopicSections(topics,all,people).other.length,0);
assert.deepEqual(selectionTopicCount(all,topics,people,"think"),
 {selected:3,total:3});

// A single topic in Think Tank means 1/3 below the course title.
one.topics.find(t=>t.topicId===shared.id).ideaChoice="on";
let parts=thinkTankTopicSections(topics,one,people);
assert.deepEqual(parts.selected.map(t=>t.id),[shared.id]);
assert.equal(parts.other.length,2);
assert.equal(parts.other.every(t=>!t.excluded && !t.planned),true);
assert.deepEqual(selectionTopicCount(one,topics,people,"think"),
 {selected:1,total:3});

// Customizing the course does not delete source topics from browsing.
const customized=choice(g9,true);
customized.topics[0].included=false;
parts=thinkTankTopicSections(topics,customized,people);
assert.equal(parts.selected.length,2);
assert.deepEqual(parts.other.map(t=>t.id),[customized.topics[0].topicId]);
assert.equal(parts.other[0].excluded,true);
assert.deepEqual(selectionTopicCount(customized,topics,people,"think"),
 {selected:2,total:3});

// A partially planned parent can have separate Think Tank and My Plan topics.
// Other topics includes the planned topic but marks it correctly, rather
// than offering a second Think Tank toggle for something already assigned.
const mixed=choice(g9,false);
mixed.stage="planned";
mixed.topics.find(t=>t.topicId!==shared.id).ideaChoice="on";
mixed.overrides.push({topicId:shared.id,studentId:"AJ",assigned:true});
parts=thinkTankTopicSections(topics,mixed,people);
assert.equal(parts.selected.length,1);
assert.equal(parts.other.length,2);
assert.equal(parts.other.some(t=>t.id===shared.id && t.planned),true);
assert.deepEqual(selectionTopicCount(mixed,topics,people,"plan"),
 {selected:1,total:3});
assert.deepEqual(selectionTopicCount(mixed,topics,people,"think"),
 {selected:1,total:3});

// Fully planned course shows no count.
const planned=choice(g9,false);planned.stage="planned";planned.studentIds=["AJ"];
assert.deepEqual(selectionTopicCount(planned,topics,people,"plan"),
 {selected:3,total:3});
assert.equal(thinkTankTopicSections(topics,planned,people).selected.length,0);

// Browser-only ideas can still show excluded topics under Other topics.
parts=thinkTankTopicSections(topics,undefined,people,[shared.id]);
assert.equal(parts.selected.length,2);
assert.equal(parts.other.length,1);
assert.equal(parts.other[0].excluded,true);
assert.deepEqual(selectionTopicCount(undefined,topics,people,"think",[shared.id]),
 {selected:2,total:3});

// Shared topic editions must stay scoped to their own combined-course parent.
const other=choice(g1012,true);
assert.equal(thinkTankTopicSections(childrenFor(g1012),other,people).selected.length,3);
assert.deepEqual(thinkTankTopicSections(topics,one,people).selected.map(t=>t.id),[shared.id]);

console.log("PASS: partial topic counts and Other topics retain unselected, excluded, and planned child distinctions.");
