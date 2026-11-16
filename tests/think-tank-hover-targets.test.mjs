import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Static regression guard for the shared mini/full Planning Desk styles.
// Visual hover behavior still needs the browser acceptance checks in docs.
const css = readFileSync(
  new URL("../app/components/planning-desk.css", import.meta.url), "utf8");
const desk = readFileSync(
  new URL("../app/components/PlanningDesk.tsx", import.meta.url), "utf8");
const review = readFileSync(
  new URL("../app/components/CourseTopicReview.tsx", import.meta.url), "utf8");

assert.ok(css.includes("/* Separate Think Tank hover targets:"));
assert.ok(!css.includes(".pd-think-review .pd-topic-row:hover"),
  "Hover must never tint the entire topic row");
assert.ok(!css.includes(".pd-think-review .pd-topic-row:focus-within"),
  "Keyboard focus must tint only the focused control, not the whole row");

for (const selector of [
  ".pd-think-review .pd-topic-row .pd-topic-title-button:hover",
  ".pd-think-review .pd-topic-row .pd-topic-title-button:focus-visible",
  ".pd-think-review .pd-topic-row .pd-topic-icon:hover:not(:disabled)",
  ".pd-think-review .pd-topic-row .pd-topic-icon:focus-visible",
  '.pd-think-review .pd-topic-row .pd-topic-icon[aria-expanded="true"]',
  ".pd-idea:not(.myplan-row) .pd-mini-info-action:hover",
  '.pd-idea:not(.myplan-row) .pd-mini-info-action[aria-expanded="true"]',
  ".pd-subject-toggle:hover",
]) {
  assert.ok(css.includes(selector), "Missing individual hover/state: " + selector);
}
assert.match(css, /\.pd-mini-info-action:hover,[\s\S]*?background:#f0f3ee;[\s\S]*?border-color:#cbd6c9;[\s\S]*?color:#4e6655;/,
  "Think Tank info hover should match Course List neutral hover tokens");
assert.match(css, /\.pd-subject-toggle:hover,[\s\S]*?background:color-mix\(in srgb,var\(--pd-subject-color/,
  "Subject toggle must strengthen its own subject tint");
assert.ok(desk.includes('"--pd-subject-color": subjectColor(subject)'),
  "Each subject needs its own color variable");
assert.ok(review.includes("other.map(topic=>renderTopic(topic,topic.excluded,true))"),
  "Other topics must reuse the same row renderer and hover styling");
console.log("Think Tank hover targets and color rules: OK");
