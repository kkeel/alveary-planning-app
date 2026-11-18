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

test("Course List course/topic and desk course/topic each have one named size",()=>{
  for(const [part,size] of [
    [".cx-course-actions",34],
    [".cx-course--topic .cx-course-actions",29],
    [".pd-idea-heading",30],
    [".pd-topic-row",27],
  ]) {
    const i=css.indexOf(part+" {");
    assert.ok(i>=0,part+" missing");
    assert.match(css.slice(i,i+175),new RegExp("--planning-icon-size:"+size+"px"));
  }
  assert.match(css,/\.plan-group-shortcuts \{/);
  assert.match(css,/\.plan-student-tools \{/);
  assert.match(css,/--planning-icon-size:28px/);
  assert.match(css,/--planning-icon-size:30px/);
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
  assert.match(css,/--planning-icon-glyph:18px/);
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
