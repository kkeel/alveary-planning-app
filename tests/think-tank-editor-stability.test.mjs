import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  thinkTankTopicSections,pinTopicWhileEditing,
} from "../app/components/planning-topic-sections.mjs";

const catalog=JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json",import.meta.url),"utf8"));
const byTitle=new Map(catalog.courses.map(c=>[c.title,c]));
const byEdition=new Map(catalog.courses.map(c=>[c.editionId,c]));
const parent=byTitle.get("History: Grade 9 (U.S.)");
const otherParent=byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(parent&&otherParent);
const topics=catalog.topicLinks.filter(t=>t.parentEditionId===parent.editionId)
  .map(t=>byEdition.get(t.childEditionId));
assert.equal(topics.length,3);
const students=[{id:"AJ"},{id:"Troy"}];
const state={
  courseId:parent.id,stage:"idea",ideaAll:false,
  studentIds:[],overrides:[],
  topics:topics.map(topic=>({
    topicId:topic.id,topicEditionId:topic.editionId,
    included:true,ideaChoice:"inherit",
  })),
};
const first=topics[0],second=topics[1],third=topics[2];
state.topics[0].ideaChoice="on";
let groups=thinkTankTopicSections(topics,state,students);
assert.deepEqual(groups.selected.map(t=>t.id),[first.id]);
assert.deepEqual(groups.other.map(t=>t.id),[second.id,third.id]);

// Student picker launched from the SELECTED Think Tank topic.
// A checkbox immediately saves, but its row stays in Think Tank until the
// editor's Done or Cancel/Close callback releases this local view pin.
let pinned=pinTopicWhileEditing(topics,groups,first.id,"selected");
assert.deepEqual(pinned.selected.map(t=>t.id),[first.id]);
state.stage="planned";
state.overrides.push({topicId:first.id,studentId:"AJ",assigned:true});
groups=thinkTankTopicSections(topics,state,students);
assert.deepEqual(groups.selected.map(t=>t.id),[],
  "without a pin the newly planned topic correctly leaves Think Tank");
pinned=pinTopicWhileEditing(topics,groups,first.id,"selected");
assert.deepEqual(pinned.selected.map(t=>t.id),[first.id],
  "student selection must not move an open editor into Other topics");
assert.equal(pinned.other.some(t=>t.id===first.id),false);
assert.equal(pinned.selected.length+pinned.other.length,topics.length,
  "one topic is never duplicated while pinned");
assert.deepEqual(pinTopicWhileEditing(topics,groups,null,null).selected,[],
  "Done or Cancel releasing the pin applies the real saved placement");

// Same rule when the student editor was opened from OTHER topics.
const beforeOther=thinkTankTopicSections(topics,state,students);
assert.ok(beforeOther.other.some(t=>t.id===second.id));
const newChoice={...state,overrides:[
  ...state.overrides,{topicId:second.id,studentId:"Troy",assigned:true},
]};
const updated=thinkTankTopicSections(topics,newChoice,students);
const otherPinned=pinTopicWhileEditing(topics,updated,second.id,"other");
assert.ok(otherPinned.other.some(t=>t.id===second.id),
  "other-topic editor must not jump sections during assignment");
assert.equal(otherPinned.selected.some(t=>t.id===second.id),false);
assert.deepEqual(pinTopicWhileEditing(topics,updated,null,null),updated);

// Cross-parent shared topics: the view pin cannot mutate or borrow the
// other saved course, even when editions overlap.
const olderTopics=catalog.topicLinks.filter(t=>t.parentEditionId===otherParent.editionId)
  .map(t=>byEdition.get(t.childEditionId));
assert.equal(olderTopics.length,3);
const olderState={
 courseId:otherParent.id,stage:"idea",ideaAll:true,studentIds:[],overrides:[],
 topics:olderTopics.map(t=>({topicId:t.id,included:true,ideaChoice:"inherit"})),
};
assert.equal(thinkTankTopicSections(olderTopics,olderState,students).selected.length,3);
assert.equal(olderState.overrides.length,0);
console.log("PASS: Think Tank topic student editors stay in their original section until Done/Cancel, without changing saved assignments or shared parents.");
