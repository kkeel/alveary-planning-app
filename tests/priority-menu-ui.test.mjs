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
test("Student editor priority is in header utilities and individual customization stays optional",()=>{
  const header=students.slice(students.indexOf('<div className="plan-assign-head">'),
    students.indexOf('{addingStudent && <form'));
  assert.match(header,/plan-assign-priority/);
  assert.match(header,/SharedPriorityEditor/);
  assert.match(students,/Advanced assignment/);
  assert.match(students,/setAssignmentPriority/);
  assert.doesNotMatch(students,/Use course default \(/);
});
test("setting priority on an unchosen item establishes an idea rather than an assignment",()=>{
  assert.match(control,/plan\.addChoice\(courseId\)/);
  assert.match(control,/plan\.toggleListIdea\(courseId,topicId\)/);
  assert.doesNotMatch(control,/plan\.assignCourse|plan\.assignTopic/);
});
