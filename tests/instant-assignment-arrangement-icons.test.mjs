import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const shared=read("app/components/SharedArrangementEditor.tsx");
const student=read("app/components/StudentArrangementControl.tsx");
const css=read("app/globals.css");
const list=read("app/courses/CourseExplorer.tsx");
const cloud=read("app/components/DemoPlanContext.tsx");

test("the course, topic and student arrangement controls share one neutral placeholder",()=>{
  assert.match(student,/export function ArrangementPlaceholderSymbol/);
  assert.match(student,/<Columns2 size=\{size\} strokeWidth=\{1\.6\}/);
  assert.match(shared,/ArrangementPlaceholderSymbol/);
  assert.doesNotMatch(shared,/CircleDashed/);
  assert.match(shared,/isUnset\?<ArrangementPlaceholderSymbol/);
  assert.match(student,/isUnset\?<ArrangementPlaceholderSymbol/);
  assert.match(shared,/Same as course/);
  assert.match(student,/Same as plan/);
});

test("an implicit later fallback differs from a member's explicit Decide later choice",()=>{
  assert.match(shared,/const isUnset=shown===null \|\| \(shown==="Later"&&!hasChosenArrangement\)/);
  assert.match(student,/const isUnset=effective==="Later"&&!hasChosenArrangement/);
  assert.match(shared,/shown==="Later"\?"Decide later"/);
  assert.match(student,/effective==="Later"\?"Decide later"/);
  assert.match(student,/if \(value==="Later"\) return <Clock3/);
  assert.match(css,/\.shared-arrangement-control\.is-unset \.priority-control-trigger/);
  assert.match(css,/\.student-arrangement-control\.is-unset \.student-arrangement-trigger/);
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
