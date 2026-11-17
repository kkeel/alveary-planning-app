import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shell = read("app/globals.css");
const explorer = read("app/courses/course-explorer.css");
const desk = read("app/components/planning-desk.css");
const component = read("app/components/PlanningDesk.tsx");
const breakpoint = 810;

// Use the same available-workspace breakpoint for both layout and drawer.
// A viewport-only breakpoint cannot account for the collapsible left nav.
assert.match(shell, /container:\s*planning-workspace\s*\/\s*inline-size;/);
for (const source of [shell, desk]) {
  assert.ok(source.includes("@container planning-workspace (max-width:" + breakpoint + "px)"),
    "Shell and desk must change modes at the same workspace width");
}
assert.ok(!shell.includes("@media (max-width: 1280px)"),
  "Do not switch based on a fixed viewport breakpoint");
assert.ok(!desk.includes("@media (max-width: 1280px)"),
  "The drawer breakpoint must follow the workspace container");

// The desk stays at 370px and the list takes the remaining width,
// right up to approximately a 50/50 share.
assert.match(shell, /grid-template-columns:minmax\(0,1fr\) minmax\(0,370px\);/);
const deskWidth = 370;
const gap = 18;
const rightPadding = 16;
for (const pagePadding of [26, 44]) {
  const listWidth = breakpoint - rightPadding - gap - deskWidth - pagePadding;
  assert.ok(Math.abs(listWidth - deskWidth) <= 12,
    "At drawer transition, list and desk should be approximately equal");
}
assert.ok(explorer.includes(".shell-page-layout.has-planning-desk .cx-page-columns"),
  "The Course List must discard its unused nested two-column grid");
assert.match(explorer,
  /\.shell-page-layout\.has-planning-desk \.cx-page-columns\s*\{\s*grid-template-columns:minmax\(0,1fr\);/);

// Subject containers need the full available mini-desk width, even though
// the whole desk retains header and tab padding.
assert.match(desk, /\.pd-desk \.pd-body\s*\{\s*margin-inline:-15px;/);
assert.match(desk,
  /\.pd-desk \.pd-subject-list\s*\{\s*width:100%;\s*padding-inline:6px;/,
  "Full-width subject stack should retain only a six-pixel edge inset");
assert.ok(desk.includes(".pd-desk .pd-subject-items.pd-think-course-list"));
assert.ok(desk.includes("padding-left:4px;") && desk.includes("padding-right:4px;"),
  "Keep only a tiny interior inset for separate course cards");

// Scrolling lock should depend on the actual slide-out overlay, including
// when the navigation opens/closes and changes workspace width.
assert.ok(component.includes('window.getComputedStyle(scrim).display !== "none"'));
assert.ok(component.includes("new ResizeObserver(syncScrollLock)"));
assert.ok(!component.includes('window.matchMedia("(max-width: 1280px)")'));

// The full-page planning columns and detail editors remain unaffected.
assert.ok(desk.includes(".pd-full-columns { display:grid;"));
assert.ok(desk.includes(".pd-think-course-list > .pd-idea.is-open"));

console.log("Planning Desk full-width subjects and 50/50 split breakpoint: OK");
