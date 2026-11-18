import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const sw=read("app/components/DetailViewSwitch.tsx");
const context=read("app/components/PlanningDeskContext.tsx");
const explorer=read("app/courses/CourseExplorer.tsx");
const css=read("app/components/planning-desk.css");
const listCss=read("app/courses/course-explorer.css");
const assignment=read("app/components/StudentAssignmentEditor.tsx");
const shared=read("app/components/SharedPriorityEditor.tsx");
const studentPriority=read("app/components/StudentPriorityControl.tsx");
const contextSwitch=read("app/components/SharedTopicStudentEditor.tsx");
const globals=read("app/globals.css");

test("Compact, Expanded topic rows, Detailed full content, default Detailed",()=>{
 for(const value of ['"compact"','"topics"','"detailed"']) assert.match(sw,new RegExp(value));
 for(const label of ["Compact","Expanded","Detailed"]) assert.match(sw,new RegExp(label));
 assert.match(context,/listDetails: "detailed"/);
 assert.match(context,/saved\.listDetails === "topics"/);
 assert.match(explorer,/visibleMode !== "compact"/);
 assert.match(explorer,/showFullDetails = visibleMode === "detailed"/);
 assert.match(explorer,/showFullDetails && course\.description/);
 assert.match(explorer,/showFullDetails && course\.tips/);
 assert.match(explorer,/detailMode: showFullDetails \? "detailed" : "compact"/);
 assert.match(explorer,/isExpanded && children\.length > 0/);
});
test("Same as inherited priority choices remove redundant overrides",()=>{
 assert.match(shared,/effectivePick === effectiveBase \? null : picked/);
 assert.match(studentPriority,/const inheritedValue=effectivePlanningPriority/);
 assert.match(studentPriority,/plan\.setAssignmentPriority\(courseId,studentId,topicId,next\)/);
 assert.doesNotMatch(globals,/\.student-priority-control\.is-custom \.priority-control-trigger::after/);
});
test("Group editor appears immediately after shortcut tools and before student roster",()=>{
 const form=assignment.indexOf('groupEditing && <div className="plan-group-form"');
 const roster=assignment.indexOf('className="plan-student-list"');
 assert.ok(form>0 && form<roster);
});
test("Course list supports two columns before three, with narrow one-column desk",()=>{
 assert.match(css,/@container student-editor \(min-width:470px\)/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/@container student-editor \(min-width:960px\)/);
 assert.match(css,/\.plan-editor \.plan-student-list \{ grid-template-columns:minmax\(0,1fr\); \}/);
});
test("Color dots match agreed Alveary palette and neutral selected tags are tinted",()=>{
 assert.match(css,/\.pd-student-priority-dot\.is-core \{ background:#596e5e; \}/);
 assert.match(css,/\.pd-student-priority-dot\.is-high \{ background:#adb58f; \}/);
 assert.match(css,/\.pd-student-priority-dot\.is-additional \{ background:#e8e9e2/);
 assert.match(listCss,/\.priority-control:not\(\.has-priority\) \.priority-control-trigger/);
 assert.match(listCss,/background:var\(--cx-subject-pale\)/);
});
test("Course-level toolbar matches topic priority, info, More and shared chooser is concise",()=>{
 const plan=read("app/components/MyPlanPanel.tsx");
 const desk=read("app/components/PlanningDesk.tsx");
 for(const source of [plan,desk]){
   const priority=source.indexOf("<SharedPriorityEditor courseId=");
   const info=source.indexOf('className="pd-row-tool pd-mini-info-action"',priority);
   const more=source.indexOf('className="pd-more-anchor"',info);
   assert.ok(priority>0 && info>priority && more>info);
 }
 assert.match(contextSwitch,/↔ Shared course options/);
 assert.match(contextSwitch,/Choose a course to edit/);
 assert.doesNotMatch(contextSwitch,/Changes below apply only/);
});
