import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const css=read("app/planning-icon-controls.css");
const layout=read("app/layout.tsx");
const shared=read("app/components/SharedArrangementEditor.tsx");
const student=read("app/components/StudentArrangementControl.tsx");
const inheritance=read("app/components/arrangement-inheritance.mjs");

test("one shared planning icon control class is used across all four surfaces",()=>{
  for(const path of [
    "app/courses/CourseExplorer.tsx",
    "app/components/CourseTopicReview.tsx",
    "app/components/MyPlanPanel.tsx",
    "app/components/PlanningDesk.tsx",
    "app/components/SharedPriorityEditor.tsx",
    "app/components/SharedArrangementEditor.tsx",
    "app/components/StudentPriorityControl.tsx",
    "app/components/StudentArrangementControl.tsx",
  ]) {
    assert.match(read(path),/planning-icon-control/,path);
  }
  assert.match(layout,/import "\.\/planning-icon-controls\.css"/);
});

test("Course List and desk course/topic controls share the topic-sized target",()=>{
  for(const [part,size] of [
    [".cx-course-actions",27],
    [".cx-course--topic .cx-course-actions",27],
    [".pd-idea-heading",27],
    [".pd-topic-row",27],
  ]) {
    const i=css.indexOf(part+" {");
    assert.ok(i>=0,part+" missing");
    assert.match(css.slice(i,i+175),new RegExp("--planning-icon-size:"+size+"px"));
  }
  assert.match(css,/\.plan-group-shortcuts \{/);
  assert.match(css,/\.plan-student-tools \{/);
  assert.match(css,/--planning-icon-size:27px/);
});

test("One source defines the neutral resting, hover, open, focus and reduced-motion states",()=>{
  for(const value of [
    "--planning-icon-border", "--planning-icon-foreground",
    "--planning-icon-hover-background","--planning-icon-hover-border",
    "--planning-icon-hover-foreground","--planning-icon-open-background",
    "--planning-icon-focus-ring",
  ]) assert.ok(css.includes(value));
  assert.match(css,/\.planning-icon-control\):where\(:not\(\.is-tone-full\)/);
  assert.match(css,/\[aria-expanded="true"\]:where\(:not\(\.is-selected\)/);
  assert.match(css,/:focus-visible/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test("Selected subject colors and disclosure widths are preserved",()=>{
  assert.match(css,/:not\(\.is-selected\):not\(\.is-tone-full\):not\(\.is-tone-partial\)/);
  assert.match(css,/\.cx-course-actions button\.planning-icon-control\.cx-info-action \{/);
  assert.match(css,/background:var\(--cx-subject-pale\)/);
  assert.match(css,/--planning-icon-glyph:15px/);
});

test("Unset arrangement is visually faint Separate, and not stored as Separate",()=>{
  const circles=student.slice(student.indexOf("export function ArrangementPlaceholderSymbol"),
    student.indexOf("/** The same lightweight"));
  assert.match(circles,/<circle cx="7" cy="12" r="5"\/>/);
  assert.match(circles,/<circle cx="18" cy="12" r="5"\/>/);
  assert.match(css,/opacity:\.66/);
  assert.match(student,/const isUnset=effective==="Later"/);
  assert.match(shared,/const isUnset=shown===null \|\| shown==="Later"/);
  assert.match(shared,/\["Combined","Separate"\]/);
  assert.doesNotMatch(shared,/\["Combined","Separate","Later"\]/);
  assert.doesNotMatch(student,/\{value:"Later",label:"Decide later"/);
  assert.match(inheritance,/const chosen = value => value === "Later" \? null : value/);
});

test("Labeled + All is content-width and More dots have an unboxed rest state",()=>{
  const list=read("app/courses/CourseExplorer.tsx");
  const desk=read("app/components/PlanningDesk.tsx");
  const myPlan=read("app/components/MyPlanPanel.tsx");
  const topics=read("app/components/CourseTopicReview.tsx");
  assert.match(list,/className="cx-plus-all">All/);
  assert.match(css,/\.cx-direct-plan-action:has\(\.cx-plus-all\)/);
  assert.match(css,/min-width:61px/);
  assert.match(css,/white-space:nowrap/);
  assert.match(css,/button\.planning-icon-control:is\(\.pd-more,\.pd-topic-more\)/);
  assert.match(css,/border-color:transparent;\s*background:transparent;/);
  for(const component of [desk,myPlan,topics]) assert.match(component,/<MoreHorizontal/);
});

test("Direct course/topic clicks stay saturated while neighboring controls are pale",()=>{
  const list=read("app/courses/course-explorer.css");
  const first=list.indexOf("/* Selected course / topic toolbars share a consistent visual hierarchy.");
  const generic=list.indexOf("background:var(--cx-subject-pale);",first);
  const full=list.indexOf("button.planning-icon-control:is(.cx-idea-action,.cx-direct-plan-action).is-tone-full",first);
  assert.ok(first>=0 && generic>first && full>generic,
    "Saturated clicked actions must be defined after the generic pale toolbar rule");
  assert.match(list,/\.cx-course\.cx-has-planning-selection > \.cx-course-head[\s\S]*?button\.planning-icon-control:is\(\.cx-idea-action,\.cx-direct-plan-action\)\.is-tone-full\s*\{\s*background:var\(--cx-subject\);/);
  assert.match(list,/\.is-tone-full:hover:not\(:disabled\)\s*\{\s*background:color-mix/);
  assert.match(list,/button\.planning-icon-control\.cx-info-action\.is-open\s*\{[\s\S]*?background:var\(--cx-subject-pale\)/);
});

test("Planning density control remains sticky and mini desk controls inherit row backgrounds",()=>{
  const deskCss=read("app/components/planning-desk.css");
  const think=read("app/components/PlanningDesk.tsx");
  const plan=read("app/components/MyPlanPanel.tsx");
  assert.match(deskCss,/\.pd-details-toolbar\s*\{\s*position:sticky;\s*top:0;\s*z-index:16;/);
  assert.match(deskCss,/\.pd-desk \.pd-details-toolbar\s*\{\s*padding:7px 12px 9px;/);
  assert.match(deskCss,/button\.planning-icon-control\.priority-control-trigger:not\(:hover\):not\(:focus-visible\):not\(\[aria-expanded="true"\]\)\s*\{\s*background:transparent !important;/);
  for(const source of [think,plan]) {
    const intro=source.indexOf("pd-planning-guidance");
    const switchAt=source.indexOf('className="pd-details-toolbar"',intro);
    assert.ok(intro>=0 && switchAt>intro,
      "Guidance should scroll away separately; the mode switch alone stays sticky");
  }
});
