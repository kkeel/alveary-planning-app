import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listRowStatus } from "../app/courses/list-row-status.mjs";

const source = path => readFileSync(new URL("../" + path, import.meta.url),"utf8");
const css = source("app/courses/course-explorer.css");
const explorer = source("app/courses/CourseExplorer.tsx");
const desk = source("app/components/planning-desk.css");
const students = [{id:"child"}];

const course = (type, params = {}) => ({
  stage:type, ideaAll:false, studentIds:[], overrides:[],
  topics:[{topicId:"topic",included:true,ideaChoice:"inherit"}],
  ...params
});

// History Grade 9: + All has a saturated parent and pale included topics,
// with NO topic rail. Ordinary inherited background/button tones remain.
const allPlan = course("planned",{studentIds:["child"]});
assert.equal(listRowStatus(allPlan,students,null,true).planTone,"full");
assert.equal(listRowStatus(allPlan,students,"topic",true).planTone,"inherited");
assert.ok(css.includes(".cx-course.cx-course--topic:is(.cx-status-partial, .cx-status-inherited, .cx-context-inherited) {\n  box-shadow:none;"),
  "The + All inherited state cannot draw a full-topic rail");
assert.ok(!css.includes(".cx-course--topic.cx-status-inherited > .cx-course-head::before"),
  "The + All inherited state cannot draw a title-only rail");
assert.ok(css.includes(".cx-course.cx-status-inherited > .cx-course-head,"),
  "Light inherited header treatment is still in place");

// History Grades 10–12: direct topic plan restores the full-length strong
// selection rail next to its title, metadata and expanded description.
const partialPlan = course("planned",{overrides:[{topicId:"topic",studentId:"child",assigned:true}]});
assert.equal(listRowStatus(partialPlan,students,null,true).planTone,"partial");
assert.equal(listRowStatus(partialPlan,students,"topic",true).planTone,"full");
assert.ok(css.includes(".cx-course.cx-course--topic.cx-status-full {\n  box-shadow:inset 3px 0 0 var(--cx-subject);"),
  "Directly planned topics need a full-height saturated rail");
assert.ok(css.includes(".cx-course.cx-status-partial {\n  box-shadow:inset 3px 0 0 var(--cx-subject-medium);"),
  "The parent partial course rail must stay reciprocal");
assert.ok(!css.includes(".cx-course--topic:is(.cx-status-full, .cx-idea-tone-full) > .cx-course-head::before"),
  "Direct topic plans must not be reduced to a short title-only pseudo-rail");

// History Grades 7–8, Grades 5–6: the course-level Think Tank selection and
// direct individual topic ideas get only a med/light bar spanning the WHOLE
// title row, not down descriptions and not a tinted title background.
const ideaAll = course("idea",{ideaAll:true});
assert.equal(listRowStatus(ideaAll,students,"topic",true).ideaTone,"inherited");
const directIdea = course("idea",{topics:[{topicId:"topic",included:true,ideaChoice:"on"}]});
assert.equal(listRowStatus(directIdea,students,"topic",true).ideaTone,"full");
assert.ok(explorer.includes('status.ideaActive ? " cx-status-idea cx-idea-tone-" + status.ideaTone'),
  "CourseRow exposes direct/inherited idea tones without changing saved data");
assert.ok(css.includes(".cx-course--topic > .cx-course-head { position:relative; }"));
assert.ok(css.includes(".cx-course--topic:is(.cx-idea-tone-full, .cx-idea-tone-inherited):not(.cx-status-full) > .cx-course-head {\n  background:transparent;"),
  "Think Tank title rows must remain unwashed");
assert.ok(css.includes(".cx-course--topic:is(.cx-idea-tone-full, .cx-idea-tone-inherited):not(.cx-status-full) > .cx-course-head::before {"),
  "Both idea origin types have title-row-only rails");
assert.ok(css.includes("  top:0;\n  bottom:0;\n  width:3px;"),
  "Think Tank rail fills the whole title row height, with no six-pixel shortening");
assert.ok(css.includes("  background:var(--cx-subject-medium);"),
  "Direct Think Tank topic uses medium, not fully saturated, subject hue");
assert.ok(css.includes(".cx-course--topic.cx-idea-tone-inherited:not(.cx-status-full) > .cx-course-head::before {\n  width:2px;\n  background:var(--cx-subject-soft);"),
  "Inherited Think Tank topic uses a lighter rail");

// Choice instructions and tags remain, but just a stronger bottom divider
// distinguishes the heading when the first option has a colored title.
assert.ok(css.includes(".cx-choice {\n  border:0;"));
assert.ok(css.includes("border-bottom:2px solid #bcc8b8;"));
assert.ok(!css.includes(".cx-choice-options {\n  border-left:"));
assert.ok(css.includes(".cx-choice-tag {"));

// The previously accepted 12px Planning Desk subject inset is retained.
assert.match(desk,/\.pd-desk \.pd-subject-list\s*\{\s*width:100%;\s*padding-inline:12px;/);
assert.ok(desk.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"));
console.log("Topic plan rails, Think Tank title rails, + All, choice divider and desk inset: OK");
