import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const shared=read("app/components/SharedArrangementEditor.tsx");
const student=read("app/components/StudentArrangementControl.tsx");
const css=read("app/planning-icon-controls.css");
const list=read("app/courses/CourseExplorer.tsx");
const cloud=read("app/components/DemoPlanContext.tsx");

test("the course, topic and student arrangement controls share one neutral placeholder",()=>{
  assert.match(student,/export function ArrangementPlaceholderSymbol/);
  assert.match(student,/<circle cx="7" cy="12" r="5"\/>/);
  assert.match(student,/<circle cx="18" cy="12" r="5"\/>/);
  assert.match(shared,/ArrangementPlaceholderSymbol/);
  assert.doesNotMatch(shared,/CircleDashed/);
  assert.match(shared,/isUnset\?<ArrangementPlaceholderSymbol/);
  assert.match(student,/isUnset\?<ArrangementPlaceholderSymbol/);
  assert.match(shared,/Same as course/);
  assert.match(student,/Same as plan/);
});

test("unset is a faint Separate-shaped invitation; Decide Later is not a required menu option",()=>{
  assert.match(shared,/const isUnset=shown===null \|\| shown==="Later"/);
  assert.match(student,/const isUnset=effective==="Later"/);
  assert.doesNotMatch(shared,/\["Combined","Separate","Later"\]/);
  assert.doesNotMatch(student,/\{value:"Later",label:"Decide later"/);
  assert.match(student,/if \(value==="Later"\) return <ArrangementPlaceholderSymbol/,
    "legacy Later reads as the unset invitation, never a new selection");
  assert.match(css,/\.shared-arrangement-control\.is-unset/);
  assert.match(css,/\.student-arrangement-control\.is-unset/);
  assert.match(css,/opacity:\.66/);
});
test("a combined or nested student editor opens from an optimistic parent",()=>{
  assert.match(cloud,/const preview=previewTopicsForCourse\(catalog,courseId\)/);
  assert.match(cloud,/topics:preview,studentIds:\[\],overrides:\[\]/);
  assert.match(list,/cloud\.prepareListPlan\(courseId,topicId\)/);
  assert.match(list,/setPlanningTarget\(\{courseId,topicId\}\)/);
  assert.match(list,/canOpenListStudentEditor\(parentChoice, course\.type, nested\)/);
  assert.match(list,/SharedTopicStudentEditor/);
  assert.match(list,/StudentAssignmentEditor/);
});
