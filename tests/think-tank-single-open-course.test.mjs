import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toggleThinkCourse } from "../app/components/think-tank-accordion.mjs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const desk = read("app/components/PlanningDesk.tsx");
const css = read("app/components/planning-desk.css");

// One active ID for ALL subject groups. Clicking the next course must close
// the old course, even when it belongs to a different subject.
let active = null;
active = toggleThinkCourse(active, "English: Language Study 7");
assert.equal(active, "English: Language Study 7");
active = toggleThinkCourse(active, "History: Grade 9");
assert.equal(active, "History: Grade 9");
active = toggleThinkCourse(active, "History: Grade 9");
assert.equal(active, null);

// Compact allows one manually opened course, but Expanded and Detailed
// reveal all topics without modifying the member's saved display preference.
assert.ok(desk.includes('const [openThinkCourseId, setOpenThinkCourseId]'),
  "Use a single global Think Tank accordion state");
assert.ok(!desk.includes("reviewOverrides") && !desk.includes("setReviewOverrides"),
  "Per-row disclosure flags must not permit multiple open courses");
assert.ok(desk.includes('desk.thinkDetails !== "compact" || activeThinkCourseId === idea.id;'),
  "Expanded and Detailed show topic lists; Compact retains a single local accordion");
assert.ok(desk.includes("toggleThinkDetails(idea.id, event.currentTarget)"),
  "Course title and info should use the same accordion action");
assert.ok(desk.includes("openThinkForAssignment(idea.id, event.currentTarget)"),
  "Assigning a course must open it and close the previously open course");
assert.ok(desk.includes('role="region" aria-label={"Details for " + idea.title}'),
  "Expanded course details should be clearly labeled");
assert.ok(desk.includes("rememberThinkAnchor") && desk.includes("useLayoutEffect"),
  "Changing expanded courses should preserve the clicked row's scroll position");

// Every planning surface now offers the same three density choices.
assert.ok(desk.includes('<DetailViewSwitch label="Think Tank"'));
assert.ok(!desk.includes("pd-full-status"), "Redundant full-page title removed");

// Individual course rows remain distinguishable in the lightweight list.
// Only expanded details, not the whole course, get the subject-colored rail.
assert.ok(desk.includes('className="pd-subject-items pd-think-course-list"'));
assert.ok(css.includes(".pd-think-course-list > .pd-idea.is-open > .pd-idea-heading"));
assert.ok(css.includes(".pd-think-course-list > .pd-idea + .pd-idea"));
assert.ok(css.includes("border-top:1px solid #e3e9e2;"));
assert.ok(css.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"));
assert.ok(css.includes(".pd-think-course-list > .pd-idea > .pd-review.pd-think-review"));
assert.ok(!css.includes(".pd-think-review .pd-topic-row:hover"),
  "Topic hover must still apply to controls, not whole rows");

console.log("Think Tank compact accordion, expanded topics and course boundaries: OK");
