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
  ".pd-idea .pd-mini-info-action:hover",
  '.pd-idea .pd-mini-info-action[aria-expanded="true"]',
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
assert.match(review,
  /const selectionMark = mode === "think" && isOther && assignedInThisCourse\(topic\)/,
  "My Plan checkmarks in Other topics must remain supported");
assert.equal(
  (review.match(/\{selectionMark\}\{topicTitle\}/g) ?? []).length,
  2,
  "Both clickable and static topic titles use their shared marker and text");
assert.match(css, /\.pd-topic-row \.pd-topic-name\s*\{\s*display:flex;/,
  "Title and status marker must share one visual surface");
assert.ok(css.includes(".pd-topic-title-button:hover .pd-topic-selection-mark"),
  "Hovering a topic title must also color the status marker");
assert.ok(css.includes(".pd-topic-title-button:focus-visible .pd-topic-selection-mark"),
  "Keyboard focus must also color the status marker");

const listCss = readFileSync(
  new URL("../app/courses/course-explorer.css", import.meta.url), "utf8");
const rule = (source, selector) => {
  const index = source.indexOf(selector);
  assert.ok(index >= 0, "Missing CSS selector: " + selector);
  const open = source.indexOf("{", index);
  const close = source.indexOf("}", open);
  assert.ok(open >= 0 && close > open, "Incomplete CSS rule: " + selector);
  return source.slice(open + 1, close);
};
const declaration = (body, property) => {
  const match = body.match(new RegExp("(?:^|;)\\s*" + property + ":\\s*([^;]+);"));
  assert.ok(match, "Missing declaration: " + property + " in " + body);
  return match[1].trim();
};

// Keep all unselected Think Tank hovers aligned with the actual Course List,
// rather than checking them against independently copied hard-coded colors.
const courseNeutral = rule(listCss,
  ".cx-course-actions .cx-info-action:not(.is-member):hover:not(:disabled),");
for (const selector of [
  ".pd-idea .pd-idea-review:hover,",
  ".pd-idea .pd-more:hover,",
  ".pd-idea .pd-mini-info-action:hover,",
  ".pd-think-toolbar-plus:hover:not(:disabled)",
  ".pd-think-review .pd-topic-row .pd-topic-title-button:hover,",
  ".pd-think-review .pd-topic-row .pd-topic-icon:hover:not(:disabled),",
  ".pd-think-review .pd-topic-menu button:hover:not(:disabled),",
]) {
  const think = rule(css, selector);
  for (const property of ["background", "color"]) {
    assert.equal(declaration(think, property), declaration(courseNeutral, property),
      selector + " should match Course List neutral " + property);
  }
}
const courseOpenInfo = rule(listCss,
  ".cx-course-actions .cx-info-action.is-open:not(.is-member):hover:not(:disabled)");
const thinkOpenInfo = rule(css,
  '.pd-idea .pd-mini-info-action[aria-expanded="true"]:hover,');
assert.equal(declaration(thinkOpenInfo, "background"),
  declaration(courseOpenInfo, "background"),
  "Expanded Think Tank info hover should match Course List expanded View/Hide hover");

console.log("Think Tank hover targets and color rules: OK");
