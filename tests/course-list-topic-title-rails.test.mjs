import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listRowStatus } from "../app/courses/list-row-status.mjs";

const source = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");
const css = source("app/courses/course-explorer.css");
const explorer = source("app/courses/CourseExplorer.tsx");
const desk = source("app/components/planning-desk.css");
const students = [{id:"child"}];

const course = (type, params = {}) => ({
  stage:type, ideaAll:false, studentIds:[], overrides:[],
  topics:[{topicId:"topic", included:true, ideaChoice:"inherit"}],
  ...params
});
// Inherited + All planned topics are pale and do not get the old full-height rail.
const allPlan = course("planned",{studentIds:["child"]});
assert.equal(listRowStatus(allPlan,students,"topic",true).planTone,"inherited");
// Directly chosen topic: strong title-length rail; a partially chosen parent
// retains its existing partial course-level reciprocal selection style.
const partialPlan = course("planned",{overrides:[{topicId:"topic",studentId:"child",assigned:true}]});
assert.equal(listRowStatus(partialPlan,students,null,true).planTone,"partial");
assert.equal(listRowStatus(partialPlan,students,"topic",true).planTone,"full");
// Course-level idea makes child topics lightly inherited; direct topic ideas
// remain strong, without selecting unrelated sibling topics.
const ideaAll = course("idea",{ideaAll:true});
assert.equal(listRowStatus(ideaAll,students,"topic",true).ideaTone,"inherited");
const directIdea = course("idea",{topics:[{topicId:"topic",included:true,ideaChoice:"on"}]});
assert.equal(listRowStatus(directIdea,students,"topic",true).ideaTone,"full");
assert.ok(explorer.includes('status.ideaActive ? " cx-status-idea cx-idea-tone-" + status.ideaTone'),
  "CourseRow passes the Think Tank direct/inherited tone into topic classes");

// Strong/soft inherited rail cannot be placed on the full topic card.
assert.ok(css.includes(".cx-course.cx-course--topic:is(.cx-status-full, .cx-status-partial, .cx-status-inherited, .cx-context-inherited) {\n  box-shadow:none;"),
  "Nested topics override full-height full/partial/inherited selection rails");
assert.ok(css.includes(".cx-course--topic > .cx-course-head { position:relative; }"));
assert.ok(css.includes(".cx-course--topic:is(.cx-status-full, .cx-idea-tone-full) > .cx-course-head::before,"),
  "Explicitly selected topics use a short bold rail at the title");
assert.ok(css.includes(".cx-course--topic.cx-idea-tone-inherited:not(.cx-status-full) > .cx-course-head::before"),
  "Inherited Think Tank topics get a short pale rail");
assert.ok(css.includes("  top:6px;\n  bottom:6px;\n  width:3px;"),
  "Rail is restricted to title-heading height with vertical breathing room");
assert.ok(css.includes("  width:2px;\n  background:var(--cx-subject-medium);"),
  "Inherited Think Tank uses the lighter subject tone");
assert.ok(!css.includes(".cx-course--topic.cx-status-inherited > .cx-course-head::before"),
  "+ All inherited planned topics must not get a separate title bar");
// Parent-level full and partial rails are intentionally untouched.
assert.ok(css.includes(".cx-course.cx-status-full {\n  box-shadow:inset 3px 0 0 var(--cx-subject);"));
assert.ok(css.includes(".cx-course.cx-status-partial {\n  box-shadow:inset 3px 0 0 var(--cx-subject-medium);"));
assert.ok(css.includes(".cx-course.cx-status-inherited > .cx-course-head,"),
  "Inherited + All topics keep their light header wash");

// No choice box; header, tags and ordinary row dividers are sufficient.
assert.ok(css.includes(".cx-choice {\n  border:0;"));
assert.ok(!css.includes(".cx-choice-options {\n  border-left:"));
assert.ok(!css.includes("border-bottom:2px solid #d1d8ce"));
assert.ok(css.includes(".cx-choice + .cx-course,"));
assert.ok(css.includes(".cx-choice-header {") && css.includes("background:#f0f1ed;"));
assert.ok(css.includes(".cx-choice-tag {"));
// Mini desk subjects have slightly more space from outer frame; details rail remains.
assert.match(desk,/\.pd-desk \.pd-subject-list\s*\{\s*width:100%;\s*padding-inline:12px;/);
assert.ok(desk.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"));
console.log("Course choice headers, title-length topic rails, + All inheritance, and desk inset: OK");
