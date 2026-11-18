import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const css = read("app/components/planning-desk.css");
const desk = read("app/components/PlanningDesk.tsx");
const myPlan = read("app/components/MyPlanPanel.tsx");

const listStart = css.indexOf("/* Think Tank courses are LIST rows, not nested cards.");
const listEnd = css.indexOf("/* Subject sections are not cards", listStart);
assert.ok(listStart >= 0 && listEnd > listStart,
  "Require the new Think Tank list styles instead of older course cards");
const listRules = css.slice(listStart,listEnd);

assert.match(listRules,
  /\.pd-think-course-list\s*\{[\s\S]*?gap:0;[\s\S]*?\}/,
  "Courses should stack as a list, with no card gap");
assert.match(listRules,
  /\.pd-think-course-list > \.pd-idea:first-child\s*\{\s*border:0;\s*border-radius:0;\s*background:transparent;\s*box-shadow:none;/,
  "Course rows must not retain card outlines or fills");
assert.match(listRules,
  /\.pd-think-course-list > \.pd-idea \+ \.pd-idea\s*\{\s*border-top:1px solid #e3e9e2;/,
  "Only a muted divider should separate adjacent course rows");

const detailsStart = listRules.indexOf(
  ".pd-think-course-list > .pd-idea > .pd-review.pd-think-review");
const detailRules = listRules.slice(detailsStart,listRules.indexOf("}",detailsStart));
assert.ok(detailsStart > 0, "Missing Think Tank detail panel rule");
assert.ok(detailRules.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"),
  "Only the expanded detail panel should carry a matching subject rail");
assert.ok(detailRules.includes("background:transparent;"),
  "Do not reintroduce tinted detail backgrounds");
assert.ok(detailRules.includes("margin:0 0 7px 8px;"),
  "Expanded details should have a small indent from the course title row");
const headerStart = listRules.indexOf(
  ".pd-think-course-list > .pd-idea.is-open > .pd-idea-heading");
const header = listRules.slice(headerStart,listRules.indexOf("}",headerStart));
assert.ok(header.includes("border:0;") && header.includes("background:transparent;"),
  "Expanded titles should remain unboxed, neutral list headers");

// The color must be available to children of the subject, not assigned only
// to the header sibling (which cannot pass CSS variables down to details).
assert.match(desk,
  /return <section key=\{subject\} className="pd-subject"\s+style=\{\{[\s\S]*?"--pd-subject-edge": subjectColor\(subject\) \+ "66"/,
  "Subject color needs to be inherited by the entire section");
assert.ok(desk.includes('<div className="pd-subject-heading">'));
assert.ok(css.includes("box-shadow:inset 3px 0 0 var(--pd-subject-edge,transparent);"),
  "Detail rail and subject heading must use the same color token");
assert.ok(desk.includes('desk.thinkDetails !== "compact" || activeThinkCourseId === idea.id;'),
  "Compact preserves one open course; Expanded/Detailed show all course topic lists");

// The change is strictly to the Think Tank presentation.
assert.ok(myPlan.includes('className="pd-idea myplan-row"') ||
  myPlan.includes('className={"pd-idea myplan-row"'),
  "The My Plan course presentation remains independent");
assert.ok(css.includes(".pd-desk .pd-subject,"),
  "Keep existing unboxed subject stack");

console.log("Think Tank list rows and subject-colored expanded details rail: OK");
