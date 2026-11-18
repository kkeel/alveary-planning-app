import test from "node:test";
import assert from "node:assert/strict";
import {
 sharedCoursePriority, sharedTopicPriority, sharedTopicOverride,
 sharedCourseSummary, effectivePlanningPriority, priorityRollup,
 coursePriorityRollup,topicPriorityRollup,differingStudentTopicPriority,
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

test("display rollups become Varied for different student priorities without modifying defaults",()=>{
 const shared=[{courseId:"history",topicId:null,priority:"Core"},
   {courseId:"history",topicId:"us",priority:"Additional"}];
 const student=[{courseId:"history",topicId:"us",studentId:"hannah",priority:"High Interest"}];
 const perStudent=["hannah","aj"].map(id=>effectivePlanningPriority(
   shared,student,"history","us",id));
 assert.equal(priorityRollup(perStudent),"Varied");
 assert.equal(sharedTopicPriority(shared,"history","us"),"Additional");
 assert.equal(sharedCoursePriority(shared,"history"),"Core");
 assert.equal(priorityRollup(["Core","Core"]),"Core");
 assert.equal(priorityRollup(["Core",null]),"Varied");
 assert.equal(priorityRollup([]),null);
});

test("Course List and My Plan use identical effective student-topic summaries",()=>{
 const shared=[{courseId:"history",topicId:null,priority:"Core"}];
 const student=[{courseId:"history",topicId:"us",studentId:"aj",priority:"Additional"}];
 const choice={courseId:"history",stage:"planned",ideaAll:false,studentIds:["aj","hannah"],
   overrides:[],topics:["us","world","ancient"].map((topicId,i)=>({
     topicId,included:true,ideaChoice:"inherit",order:i}))};
 const people=[{id:"aj"},{id:"hannah"}];
 assert.equal(coursePriorityRollup(shared,student,choice,people),"Varied");
 assert.equal(topicPriorityRollup(shared,student,choice,people,"us"),"Varied");
 assert.equal(topicPriorityRollup(shared,student,choice,people,"world"),"Core");
 assert.equal(differingStudentTopicPriority(shared,student,"history","us","aj"),"Additional");
 assert.equal(differingStudentTopicPriority(shared,student,"history","us","hannah"),undefined);
 assert.equal(sharedCoursePriority(shared,"history"),"Core");
});
test("Intentional no-priority difference gets a neutral metadata dot",()=>{
 const shared=[{courseId:"citizenship",topicId:"ethics",priority:"High Interest"}];
 const student=[{courseId:"citizenship",topicId:"ethics",studentId:"aj",priority:"Not set"}];
 assert.equal(differingStudentTopicPriority(shared,student,"citizenship","ethics","aj"),null);
 assert.equal(differingStudentTopicPriority(shared,student,"citizenship","ethics","other"),undefined);
});
