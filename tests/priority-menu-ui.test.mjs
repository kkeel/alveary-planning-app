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
const arrangement=read("app/components/StudentArrangementControl.tsx");
const floating=read("app/components/FloatingChoiceMenu.tsx");
const sharedArrangement=read("app/components/SharedArrangementEditor.tsx");

test("all three familiar Course Planning images are used in one compact control",()=>{
  for(const name of ["Core%20Subjects.png","High%20Interest%20Subjects.png","Additional%20Subjects.png"]){
    assert.match(control,new RegExp(name));
  }
  assert.match(control,/aria-expanded=\{open\}/);
  assert.match(control,/FloatingChoiceMenu/);
  assert.match(floating,/pointerdown/);
  assert.match(floating,/Escape/);
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
test("Student editor keeps Cancel/Done in header and planning shortcuts together",()=>{
  const header=students.slice(students.indexOf('<div className="plan-assign-head">'),
    students.indexOf('<div className="plan-assign-layout">'));
  assert.match(header,/pd-assignment-quick-actions/);
  assert.match(header,/pd-done-action/);
  assert.doesNotMatch(header,/SharedPriorityEditor/);
  const shortcuts=students.slice(students.indexOf('<div className="plan-group-shortcuts"'),
    students.indexOf('<div className="plan-student-list"'));
  assert.match(shortcuts,/plan-select-all/);
  assert.match(shortcuts,/plan-group-create/);
  assert.match(shortcuts,/plan-add-student-action/);
  assert.match(shortcuts,/SharedPriorityEditor/);
  assert.match(students,/StudentPriorityControl/);
  assert.match(students,/StudentArrangementControl/);
  assert.doesNotMatch(students,/plan-student-detail|Advanced assignment/);
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
  assert.match(topic,/pd-topic-info-action/);
  assert.match(topic,/pd-topic-menu/);
  assert.match(topic,/Edit students/);
  assert.doesNotMatch(topic,/className="pd-topic-icon pd-topic-edit"/);
});
test("Student selection is a multi-column roster with priority shown only if assigned",()=>{
  const css=read("app/components/planning-desk.css");
  assert.match(css,/\.plan-student-list\s*\{\s*display:grid/);
  assert.match(css,/grid-template-columns:repeat\(auto-fit/);
  assert.match(students,/isAssigned && <div className="plan-student-tools"/);
  assert.match(students,/<StudentPriorityControl/);
  assert.match(students,/plan-select-all/);
});

test("Arrangement offers combined, separate, later and topic inheritance inline",()=>{
  assert.match(arrangement,/setAssignmentArrangement/);
  assert.match(arrangement,/Same as plan/);
  assert.match(arrangement,/Combined/);
  assert.match(arrangement,/Separate/);
  assert.match(arrangement,/Decide later/);
  assert.match(arrangement,/FloatingChoiceMenu/);
  assert.match(floating,/onDismiss/);
  assert.doesNotMatch(students,/detailsStudentId/);
});
test("More menus remain one-row icons and My Plan shows only student-level topic counts",()=>{
  const css=read("app/components/planning-desk.css");
  assert.match(css,/\.pd-idea \.pd-inline-actions,[\s\S]*?flex-wrap:nowrap/);
  assert.match(css,/\.pd-think-review \.pd-topic-menu/);
  for(const src of [desk,plan,topic]) assert.match(src,/pd-sr-only/);
  assert.doesNotMatch(plan,/showTopicCount|selectionTopicCount/);
  assert.match(plan,/studentSummary\(course,demo\.students/);
  assert.match(css,/@container student-editor \(min-width:670px\)/);
  assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
});

test("Course menus anchor below the ellipsis and the small info controls stay centered",()=>{
 const css=read("app/components/planning-desk.css");
 assert.match(desk,/pd-more-anchor/);
 assert.match(plan,/pd-more-anchor/);
 assert.match(css,/\.pd-more-anchor\s*\{/);
 assert.match(css,/\.pd-more-anchor > \.pd-inline-actions/);
 assert.match(css,/\.pd-topic-icon\.pd-topic-info-action/);
 assert.match(topic,/pd-topic-info-action/);
});
test("Mini roster stays one column; popover flips if it would be cut off",()=>{
 const css=read("app/components/planning-desk.css");
 assert.match(css,/\.plan-editor \.plan-student-list \{ grid-template-columns:minmax\(0,1fr\)/);
 assert.match(floating,/createPortal/);
 assert.match(floating,/getBoundingClientRect/);
 assert.match(floating,/vpHeight-pad-anchor\.bottom/);
 assert.match(floating,/window\.addEventListener\("scroll",place,true\)/);
});
test("Course List receives the same effective student rollups as My Plan",()=>{
 assert.match(course,/topicPriorityRollup\(/);
 assert.match(course,/coursePriorityRollup\(/);
 assert.match(plan,/coursePriorityRollup\(/);
});

test("Shared arrangement controls exist at every optional planning stage",()=>{
  for(const src of [course,desk,plan,topic,students]){
    assert.match(src,/SharedArrangementEditor/);
  }
  assert.match(sharedArrangement,/setSharedArrangement/);
  assert.match(sharedArrangement,/Same as course/);
  assert.match(sharedArrangement,/Combined/);
  assert.match(sharedArrangement,/Separate/);
  assert.match(sharedArrangement,/Decide later/);
  assert.match(sharedArrangement,/FloatingChoiceMenu/);
});
test("Only saved member choices populate the authenticated Think Tank",()=>{
  assert.match(desk,/Retire leftover local-only bookmarks/);
  assert.match(desk,/cloud\.courses\s*\.filter\(choice=>pendingIdeaCount/);
  assert.match(course,/signedIn \? \[\] : desk\.thinkTankIds/);
});
