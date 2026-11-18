import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { previewTopicsForCourse } from "../app/courses/optimistic-topics.mjs";
import { listRowStatus, pendingIdeaCount, nextCourseIdeaAll } from "../app/courses/list-row-status.mjs";

const catalog=JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json",import.meta.url),"utf8"));
const byTitle=new Map(catalog.courses.map(c=>[c.title,c]));
const history9=byTitle.get("History: Grade 9 (U.S.)");
const history1012=byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(history9 && history1012);
const history9Topics=previewTopicsForCourse(catalog,history9.id);
const history1012Topics=previewTopicsForCourse(catalog,history1012.id);
assert.equal(history9Topics.length,3,"combined course previews its three source topics");
assert.equal(history1012Topics.length,3);
assert.ok(history9Topics.every(t=>t.included && t.ideaChoice==="inherit"));
assert.ok(history9Topics.every(t=>t.topicId && t.topicEditionId));
const usSource=history9Topics.find(topic=>
  history1012Topics.some(other=>other.topicEditionId===topic.topicEditionId));
assert.ok(usSource,"Grade 9 and Grades 10-12 share one U.S. History edition");
const people=[{id:"AJ"},{id:"Troy"}];

const savedCourseIdea={
  courseId:history9.id,stage:"idea",ideaAll:true,studentIds:[],overrides:[],
  topics:history9Topics,
};
assert.equal(listRowStatus(savedCourseIdea,people,null,true).ideaTone,"full");
for(const topic of savedCourseIdea.topics){
  assert.equal(listRowStatus(savedCourseIdea,people,topic.topicId,false).ideaTone,
    "inherited","course click shows light bulbs for all included topics immediately");
}
assert.equal(pendingIdeaCount(savedCourseIdea,people),3);

const directTopicIdea={
  ...savedCourseIdea,ideaAll:false,topics:history9Topics.map(topic=>({
    ...topic,ideaChoice:topic.topicId===usSource.topicId?"on":"inherit",
  })),
};
assert.equal(listRowStatus(directTopicIdea,people,null,true).ideaTone,"partial");
assert.equal(listRowStatus(directTopicIdea,people,usSource.topicId,false).ideaTone,
  "full","topic click shows a saturated bulb on the same render");
assert.equal(pendingIdeaCount(directTopicIdea,people),1);
for(const topic of directTopicIdea.topics.filter(t=>t.topicId!==usSource.topicId)){
  assert.equal(listRowStatus(directTopicIdea,people,topic.topicId,false).ideaTone,
    "none","untouched sibling topics remain neutral");
}
const detachedOtherParent={
  courseId:history1012.id,stage:"idea",ideaAll:false,studentIds:[],overrides:[],
  topics:history1012Topics,
};
assert.equal(pendingIdeaCount(detachedOtherParent,people),0,
  "previewing a shared edition does not color the other parent");

const single=catalog.courses.find(c=>c.type==="Single-Topic Course");
assert.ok(single);
const singleTopics=previewTopicsForCourse(catalog,single.id);
assert.deepEqual(singleTopics.map(t=>t.topicId),[single.id]);
assert.equal(previewTopicsForCourse(catalog,"does-not-exist").length,0);
assert.equal(previewTopicsForCourse(catalog,catalog.courses.find(c=>
  c.type==="Topic").id).length,0,
  "top-level raw topic is not an assignable parent choice");

console.log("PASS: instant course/topic Think Tank preview colors correct buttons and mini desk before any network response.");

const partialCourse={...savedCourseIdea,topics:savedCourseIdea.topics.map((t,index)=>({
 ...t, ideaChoice:index===1?"off":"inherit",
}))};
assert.equal(pendingIdeaCount(partialCourse,people),2);
assert.equal(nextCourseIdeaAll(partialCourse,people),true,
 "Clicking a partially selected course fills the missing topic, not deselects all");
assert.equal(nextCourseIdeaAll(savedCourseIdea,people),false,
 "Clicking a fully selected course removes the whole idea");
assert.equal(nextCourseIdeaAll(directTopicIdea,people),true,
 "A single topic idea upgrades to a complete course idea");
const courseWithPlan={...savedCourseIdea,stage:"planned",ideaAll:true,
 studentIds:[],overrides:[{studentId:"AJ",topicId:usSource.topicId,assigned:true}]};
assert.equal(pendingIdeaCount(courseWithPlan,people),2);
assert.equal(nextCourseIdeaAll(courseWithPlan,people),false,
 "Already assigned topics do not count as missing Think Tank topics");
const courseWithMissingAndPlan={...courseWithPlan,
 topics:courseWithPlan.topics.map(t=>t.topicId!==usSource.topicId
 ? {...t,ideaChoice:"off"}:t)};
assert.equal(nextCourseIdeaAll(courseWithMissingAndPlan,people),true,
 "Fill the unassigned remaining topics without changing student assignments");
