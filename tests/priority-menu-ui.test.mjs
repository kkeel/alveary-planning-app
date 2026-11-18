import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const control=read("app/components/SharedPriorityEditor.tsx");
const course=read("app/courses/CourseExplorer.tsx");
const desk=read("app/components/PlanningDesk.tsx");
const plan=read("app/components/MyPlanPanel.tsx");
const topic=read("app/components/CourseTopicReview.tsx");
const students=read("app/components/StudentAssignmentEditor.tsx");
const studentPriority=read("app/components/StudentPriorityControl.tsx");

test("all three familiar Course Planning images are used in one compact control",()=>{
  for(const name of ["Core%20Subjects.png","High%20Interest%20Subjects.png","Additional%20Subjects.png"]){
    assert.match(control,new RegExp(name));
  }
  assert.match(control,/aria-expanded=\{open\}/);
  assert.match(control,/onPointerDown/);
  assert.match(control,/Escape/);
  assert.match(control,/Same as course/);
  assert.match(control,/No priority/);
});
test("Course List uses optional toolbar priority without adding a modal step",()=>{
  const toolbar=course.slice(course.indexOf('<div className="cx-course-actions">'),
    course.indexOf('</div>\n    </div>\n    {mode === "plan" && activePlanEditor'));
  assert.match(toolbar,/cx-idea-action/);
  assert.match(toolbar,/SharedPriorityEditor/);
  assert.match(toolbar,/cx-direct-plan-action/);
  assert.doesNotMatch(course,/quickPriorityOpen|cx-priority-quick/);
  assert.doesNotMatch(course,/mode === "plan" && parentChoice && <SharedPriorityEditor/);
});
test("Think Tank, My Plan, and topic rows share the same priority affordance",()=>{
  for(const src of [desk,plan,topic]) assert.match(src,/SharedPriorityEditor courseId=/);
  assert.doesNotMatch(desk,/shared-priority-heading-summary/);
  assert.doesNotMatch(plan,/shared-priority-heading-summary/);
});
test("Student editor keeps utilities in header and personal controls beside roster rows",()=>{
  const header=students.slice(students.indexOf('<div className="plan-assign-head">'),
    students.indexOf('{addingStudent && <form'));
  assert.match(header,/plan-assign-secondary-tools/);
  assert.match(header,/SharedPriorityEditor/);
  assert.match(header,/pd-assignment-quick-actions/);
  assert.match(students,/plan-student-row/);
  assert.match(students,/isAssigned && <StudentPriorityControl/);
  assert.match(students,/StudentPriorityControl/);
  assert.match(students,/plan-student-detail/);
  assert.match(students,/setAssignmentArrangement/);
  assert.doesNotMatch(students,/Advanced assignment/);
  assert.match(studentPriority,/setAssignmentPriority/);
  assert.match(studentPriority,/effectivePlanningPriority/);
  assert.match(studentPriority,/Same as plan/);
});
test("setting priority on an unchosen item establishes an idea rather than an assignment",()=>{
  assert.match(control,/plan\.addChoice\(courseId\)/);
  assert.match(control,/plan\.toggleListIdea\(courseId,topicId\)/);
  assert.doesNotMatch(control,/plan\.assignCourse|plan\.assignTopic/);
});

test("Desk controls keep small i buttons and move books/student editing to More",()=>{
  for(const src of [desk,plan]) {
    assert.match(src,/pd-mini-info-action/);
    assert.match(src,/pd-inline-actions/);
    assert.match(src,/View books/);
  }
  assert.match(topic,/pd-topic-info/);
  assert.match(topic,/pd-topic-menu/);
  assert.match(topic,/Edit students/);
  assert.doesNotMatch(topic,/className="pd-topic-icon pd-topic-edit"/);
});
test("Student selection is a multi-column roster with priority shown only if assigned",()=>{
  const css=read("app/components/planning-desk.css");
  assert.match(css,/\.plan-student-list\s*\{\s*display:grid/);
  assert.match(css,/grid-template-columns:repeat\(auto-fit/);
  assert.match(students,/isAssigned && <StudentPriorityControl/);
  assert.match(students,/plan-select-all/);
});
