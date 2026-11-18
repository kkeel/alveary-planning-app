import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {previewTopicsForCourse} from "../app/courses/optimistic-topics.mjs";
import {buildTopicPresence,otherTopicPresence} from "../app/components/topic-presence.mjs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const catalog=JSON.parse(read("app/courses/catalog-preview.json"));
const g7=catalog.courses.find(c=>c.title==="History: Grades 7-8 (U.S.)");
const g9=catalog.courses.find(c=>c.title==="History: Grade 9 (U.S.)");
const mk=(parent,stage,ideaAll)=>({
 courseId:parent.id,stage,ideaAll,studentIds:[],overrides:[],
 topics:previewTopicsForCourse(catalog,parent.id),
});
const g7Topic=mk(g7,"idea",true).topics.find(t=>
 catalog.courses.some(c=>c.id===t.topicId&&c.title.startsWith("Ancient History:")));
assert.ok(g7Topic);
const people=[{id:"AJ"},{id:"Hannah"}];

test("Recognize a chosen Think Tank topic from another parent",()=>{
 const saved=[mk(g7,"idea",true),mk(g9,"idea",false)];
 const map=buildTopicPresence(saved,people);
 assert.deepEqual(otherTopicPresence(map,g7Topic.topicEditionId,g9.id),
   [{courseId:g7.id,location:"Think Tank"}]);
 assert.equal(otherTopicPresence(map,g7Topic.topicEditionId,g7.id).length,0);
});

test("Recognize My Plan selection in a second course without cross-assigning",()=>{
 const first=mk(g7,"planned",false);
 first.overrides=[{topicId:g7Topic.topicId,studentId:"Hannah",assigned:true}];
 const second=mk(g9,"planned",false);
 const shared=second.topics.find(t=>t.topicEditionId===g7Topic.topicEditionId);
 assert.ok(shared);
 second.overrides=[{topicId:shared.topicId,studentId:"AJ",assigned:true}];
 const map=buildTopicPresence([first,second],people);
 assert.deepEqual(otherTopicPresence(map,g7Topic.topicEditionId,g7.id),
   [{courseId:g9.id,location:"My Plan"}]);
 assert.deepEqual(otherTopicPresence(map,g7Topic.topicEditionId,g9.id),
   [{courseId:g7.id,location:"My Plan"}]);
 assert.equal(first.studentIds.length,0);
 assert.equal(second.studentIds.length,0);
 assert.equal(first.overrides[0].studentId,"Hannah");
 assert.equal(second.overrides[0].studentId,"AJ");
});

test("Including a topic without selecting it does not imply another planned use",()=>{
 const saved=[mk(g7,"idea",false),mk(g9,"idea",false)];
 const map=buildTopicPresence(saved,people);
 assert.equal(otherTopicPresence(map,g7Topic.topicEditionId,g9.id).length,0);
});

test("Excluded, untouched and other parent topics remain independent",()=>{
 const one=mk(g7,"idea",true);
 one.topics.find(t=>t.topicId===g7Topic.topicId).included=false;
 const map=buildTopicPresence([one],people);
 assert.equal((map.get(g7Topic.topicEditionId)??[]).length,0);
});
