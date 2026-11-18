import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
 sharedCourseArrangement,sharedTopicArrangementOverride,
 sharedTopicArrangement,sharedArrangementSummary,courseArrangement,
 effectiveArrangement,arrangementRollup,topicArrangementOverride
} from "../app/components/arrangement-inheritance.mjs";

test("Course arrangement is inherited without per-student duplication",()=>{
 const shared=[{courseId:"history",topicId:null,arrangement:"Combined"}];
 assert.equal(courseArrangement([],"history","Troy",shared),"Combined");
 assert.equal(effectiveArrangement([],"history","Troy","us",shared),"Combined");
 assert.equal(effectiveArrangement([],"history","AJ","world",shared),"Combined");
 assert.equal(courseArrangement([],"other","AJ",shared),"Later");
 shared[0].arrangement="Separate";
 assert.equal(effectiveArrangement([],"history","AJ","world",shared),"Separate");
});

test("Topic overrides course default before student course choice",()=>{
 const shared=[{courseId:"history",topicId:null,arrangement:"Combined"},
  {courseId:"history",topicId:"us",arrangement:"Later"}];
 const students=[{courseId:"history",studentId:"AJ",topicId:null,arrangement:"Separate"}];
 assert.equal(effectiveArrangement(students,"history","AJ","us",shared),"Separate",
   "old Later topic selection inherits the student's course arrangement");
 assert.equal(effectiveArrangement(students,"history","AJ","world",shared),"Separate");
 assert.equal(effectiveArrangement(students,"history","Troy","us",shared),"Combined",
   "old Later topic selection also inherits the shared course arrangement");
 assert.equal(effectiveArrangement(students,"history","Troy","world",shared),"Combined");
 assert.equal(sharedTopicArrangementOverride(shared,"history","us"),"inherit");
 assert.equal(sharedTopicArrangement(shared,"history","world"),"Combined");
});

test("Student topic wins without changing shared defaults or other students",()=>{
 const shared=[{courseId:"history",topicId:null,arrangement:"Separate"},
  {courseId:"history",topicId:"us",arrangement:"Combined"}];
 const students=[{courseId:"history",studentId:"AJ",topicId:"us",arrangement:"Separate"}];
 assert.equal(effectiveArrangement(students,"history","AJ","us",shared),"Separate");
 assert.equal(effectiveArrangement(students,"history","Hannah","us",shared),"Combined");
 assert.equal(sharedTopicArrangement(shared,"history","us"),"Combined");
 assert.equal(arrangementRollup(["Combined","Separate"]),"Varied");
 assert.equal(sharedArrangementSummary(shared,"history",["world","us"]),"Varied");
});

test("Single-topic course arrangements stay independent from reused topic editions",()=>{
 const shared=[
  {courseId:"history7",topicId:"ancient",arrangement:"Combined"},
  {courseId:"history9",topicId:"ancient",arrangement:"Separate"},
 ];
 assert.equal(effectiveArrangement([],"history7","Hannah","ancient",shared),"Combined");
 assert.equal(effectiveArrangement([],"history9","AJ","ancient",shared),"Separate");
});

test("The selected default is not stored as an unnecessary student override",()=>{
 const studentControl=readFileSync(new URL("../app/components/StudentArrangementControl.tsx",import.meta.url),"utf8");
 assert.match(studentControl,/value===inheritedValue\?null:value/);
 assert.match(studentControl,/Same as everyone/);
 assert.match(studentControl,/Same as plan/);
 const sharedControl=readFileSync(new URL("../app/components/SharedArrangementEditor.tsx",import.meta.url),"utf8");
 assert.match(sharedControl,/picked===courseDefault\?null:picked/);
});

test("Legacy Decide Later is an unset, not an override that blocks later decisions",()=>{
 const shared=[{courseId:"history",topicId:null,arrangement:"Later"},
   {courseId:"history",topicId:"us",arrangement:"Later"}];
 assert.equal(sharedCourseArrangement(shared,"history"),null);
 assert.equal(sharedTopicArrangementOverride(shared,"history","us"),"inherit");
 assert.equal(courseArrangement([],"history","AJ",shared),"Later",
   "the old fallback remains for internal consumers without adding a selection");
 shared[0].arrangement="Combined";
 assert.equal(effectiveArrangement([],"history","AJ","us",shared),"Combined");
 const students=[{courseId:"history",topicId:"us",studentId:"AJ",arrangement:"Later"}];
 assert.equal(topicArrangementOverride(students,"history","AJ","us"),"inherit");
 assert.equal(effectiveArrangement(students,"history","AJ","us",shared),"Combined");
});
