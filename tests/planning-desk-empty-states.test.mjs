import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = name => readFileSync(new URL("../"+name,import.meta.url),"utf8");
const desk = read("app/components/PlanningDesk.tsx");
const plan = read("app/components/MyPlanPanel.tsx");
const css = read("app/components/planning-desk.css");

// Both empty tabs must be readable in the portable desk's full-bleed
// scrolling layout (which reserves the standard full width for course rows).
assert.ok(css.includes(".pd-desk .pd-body {\n  margin-inline:-15px;"),
  "Subject list intentionally extends into the portable desk padding");
assert.ok(css.includes(".pd-desk .pd-empty-state { padding-inline:18px; }"),
  "Both empty states need their own horizontal inset inside full-bleed scroller");
assert.ok(css.includes(".pd-empty-state {\n  box-sizing:border-box;\n  width:100%;\n  min-width:0;"),
  "Empty state must fit its available width even when narrow");
assert.ok(css.includes("overflow-wrap:anywhere;"),"Long labels cannot escape the desk");
assert.ok(css.includes(".pd-desk .pd-plan-empty { box-sizing:border-box; padding-inline:18px; }"),
  "Loading and error empty state must also remain within frame");
assert.ok(css.includes(".pd-full-column-body .pd-empty-state { padding-inline:2px; }"),
  "Full Planning columns should reuse state but respect existing panel padding");

// Don't repeat an introduction on top of a custom zero-state explanation.
assert.ok(desk.includes('{ideas.length > 0 && <p className="pd-intro pd-planning-guidance">'));
assert.ok(plan.includes('{planned.length > 0 && <p className="pd-intro myplan-intro pd-planning-guidance">'));
for (const source of [desk,plan]) {
  assert.ok(source.includes('className="pd-empty-state"'));
  assert.ok(source.includes('className="pd-empty-action" href="/courses"'));
  assert.ok(source.includes('desk.setCourseMode("browse")'));
  assert.ok(source.includes("Browse courses"));
}
assert.ok(desk.includes("Your Think Tank is empty"));
assert.ok(desk.includes("use a lightbulb to save a course or topic"));
assert.ok(!desk.includes("Save a course or topic with its bookmark"),
  "No retired bookmark instructions in the new Think Tank empty state");
assert.ok(plan.includes("Your plan starts here"));
assert.ok(plan.includes("Add students to a course or topic"));
assert.ok(!plan.includes("Start with one course or topic. The others can stay"));
assert.ok(!plan.includes(">Open Think Tank</button>"),
  "Don't lead a member from empty My Plan to another empty tab");

// Navigating from the drawer must expose the course list rather than leaving
// the mobile overlay open over the destination.
assert.ok(desk.includes('onClick={() => {desk.setCourseMode("browse"); closeMobileDrawer();}}'));
assert.ok(plan.includes("onBrowseCourses?.()"));
assert.ok(desk.includes("onBrowseCourses={closeMobileDrawer}"));

// These styles should not remove the shared populated list experience.
assert.ok(desk.includes('className="pd-subject-items pd-think-course-list"'));
assert.ok(plan.includes('className="pd-subject-items pd-think-course-list"'));
console.log("Mini Planning Desk empty states: inset, readable copy, no bookmark, browse navigation and drawer close: OK");
