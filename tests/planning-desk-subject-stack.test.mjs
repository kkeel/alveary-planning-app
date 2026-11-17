import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const css = readFileSync(
  new URL("../app/components/planning-desk.css", import.meta.url), "utf8");
const desk = readFileSync(
  new URL("../app/components/PlanningDesk.tsx", import.meta.url), "utf8");
const myPlan = readFileSync(
  new URL("../app/components/MyPlanPanel.tsx", import.meta.url), "utf8");

const subjectRulesStart = css.indexOf(
  "/* Subject sections are not cards inside the Planning Desk.");
assert.ok(subjectRulesStart > 0, "Missing stacked subject section styles");
const rules = css.slice(subjectRulesStart);
assert.match(rules,
  /\.pd-desk \.pd-subject,[\s\S]*?\.pd-full-column-body \.pd-subject\s*\{\s*border:0;\s*background:transparent;/,
  "Mini and full Planning Desk subjects should have no box border");
assert.match(rules,
  /\.pd-desk \.pd-subject-list,[\s\S]*?\.pd-full-column-body \.pd-subject-list\s*\{\s*gap:4px;/,
  "Subjects should stack close together without outer card separation");
assert.match(rules,
  /\.pd-desk \.pd-subject-items,[\s\S]*?\.pd-full-column-body \.pd-subject-items\s*\{\s*padding-left:4px;\s*padding-right:4px;/,
  "Course lists should have only a small inset from the desk edge");
assert.match(rules,
  /\.pd-desk \.pd-subject-items\.pd-think-course-list\s*\{\s*padding:8px 4px 7px;/,
  "Think Tank list rows should keep a small vertical cushion");

// Subject outlines stay removed; tint wayfinding remains on the header,
// and courses are separated by rules rather than nested card outlines.
assert.ok(css.includes("box-shadow:inset 3px 0 0 var(--pd-subject-edge,transparent);"),
  "Retain subject-colored left edge on heading");
assert.ok(css.includes(".pd-think-course-list > .pd-idea + .pd-idea"),
  "Use simple rules between course list rows");
assert.ok(css.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"),
  "Expanded course details carry the subject-colored left rail");
assert.ok(desk.includes('className="pd-subject-items pd-think-course-list"'),
  "Think Tank uses a subject wrapper containing plain course list rows");
assert.ok(myPlan.includes('className="pd-subject-items"'),
  "My Plan inherits the same unboxed subject layout");
console.log("Planning Desk stacked subjects and tiny course inset: OK");
