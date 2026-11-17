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
  "Think Tank cards should keep a small vertical cushion");

// Only the outer subject outlines are removed; the subject color wayfinding
// and deliberately separate course boundaries remain untouched.
assert.ok(css.includes("box-shadow:inset 3px 0 0 var(--pd-subject-edge,transparent);"),
  "Retain subject-colored left edge on heading");
assert.ok(css.includes(".pd-think-course-list > .pd-idea.is-open"),
  "Keep individual course boundaries and open-card emphasis");
assert.ok(css.includes("border:1px solid #dce5dc;"),
  "Keep subtle individual course borders");
assert.ok(desk.includes('className="pd-subject-items pd-think-course-list"'),
  "Think Tank uses a subject wrapper containing individual course cards");
assert.ok(myPlan.includes('className="pd-subject-items"'),
  "My Plan inherits the same unboxed subject layout");
console.log("Planning Desk stacked subjects and tiny course inset: OK");
