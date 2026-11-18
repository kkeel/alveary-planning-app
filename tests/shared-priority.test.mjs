import test from "node:test";
import assert from "node:assert/strict";
import {
 sharedCoursePriority, sharedTopicPriority, sharedTopicOverride,
 sharedCourseSummary, effectivePlanningPriority,
} from "../app/components/shared-priority.mjs";

test("History course default changes only inherited topics; selected override stays",()=>{
 const rows=[{courseId:"history",topicId:null,priority:"Core"},{courseId:"history",topicId:"us",priority:"Additional"}];
 assert.equal(sharedCourseSummary(rows,"history",["world","ancient","us"]),"Varied");
 assert.equal(sharedTopicPriority(rows,"history","world"),"Core");
 assert.equal(sharedTopicPriority(rows,"history","us"),"Additional");
 rows[0].priority="High Interest";
 assert.equal(sharedTopicPriority(rows,"history","world"),"High Interest");
 assert.equal(sharedTopicPriority(rows,"history","us"),"Additional");
});
test("Ethics-only idea summarizes topic priority but does not set course default",()=>{
 const rows=[{courseId:"citizenship",topicId:"ethics",priority:"High Interest"}];
 assert.equal(sharedCoursePriority(rows,"citizenship"),null);
 assert.equal(sharedCourseSummary(rows,"citizenship",["ethics"]),"High Interest");
 assert.equal(sharedCourseSummary(rows,"citizenship",["ethics","government"]),"Varied");
 assert.equal(sharedTopicPriority(rows,"citizenship","government"),null);
});
test("Explicit topic blank blocks course default; removing override inherits again",()=>{
 const rows=[{courseId:"history",topicId:null,priority:"Core"},{courseId:"history",topicId:"us",priority:"Not set"}];
 assert.equal(sharedTopicPriority(rows,"history","us"),null);
 assert.equal(sharedTopicOverride(rows,"history","us"),"Not set");
 rows.pop();
 assert.equal(sharedTopicPriority(rows,"history","us"),"Core");
});
test("Student specific values have precise priority over shared defaults",()=>{
 const shared=[{courseId:"history",topicId:null,priority:"Core"},{courseId:"history",topicId:"us",priority:"Additional"}];
 const student=[{courseId:"history",topicId:null,studentId:"a",priority:"High Interest"},
 {courseId:"history",topicId:"us",studentId:"b",priority:"Core"}];
 assert.equal(effectivePlanningPriority(shared,student,"history","world","a"),"High Interest");
 assert.equal(effectivePlanningPriority(shared,student,"history","us","a"),"Additional");
 assert.equal(effectivePlanningPriority(shared,student,"history","us","b"),"Core");
 assert.equal(effectivePlanningPriority(shared,student,"history","world","b"),"Core");
});
test("Shared-topic parent context keeps different saved choices independent",()=>{
 const shared=[{courseId:"combined-history",topicId:"ethics",priority:"Additional"},
 {courseId:"single-ethics",topicId:"ethics",priority:"Core"}];
 assert.equal(sharedTopicPriority(shared,"combined-history","ethics"),"Additional");
 assert.equal(sharedTopicPriority(shared,"single-ethics","ethics"),"Core");
});
