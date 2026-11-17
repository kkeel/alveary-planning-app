import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { matchesCourseGrades, guidanceSegments } from "../app/courses/choice-display.mjs";

const read = path => readFileSync(new URL("../"+path, import.meta.url),"utf8");
const tsx = read("app/courses/CourseExplorer.tsx");
const css = read("app/courses/course-explorer.css");
const deskCss = read("app/components/planning-desk.css");
const data = JSON.parse(read("app/courses/catalog-preview.json"));
const plans = new Map(data.courses.map(row => [row.id,row]));
const science = data.choiceGroups.find(group => group.title === "Science Choices");
assert.ok(science && science.tags.length === 2);
const allScienceIds = [...new Set(science.tags.flatMap(tag => tag.courseIds))];
assert.equal(allScienceIds.length, 10, "one canonical catalog record per high-school course");

const scienceFor = grades => allScienceIds.map(id => plans.get(id))
  .filter(course => matchesCourseGrades(course, grades));
assert.equal(scienceFor([8]).length, 0, "Grade 1–8 only: no Science Choices header");
assert.equal(scienceFor([1,2,3,4,5,6,7,8]).length, 0);
assert.equal(scienceFor([9]).length, 5);
assert.equal(scienceFor([10]).length, 6);
assert.equal(scienceFor([11]).length, 9);
assert.equal(scienceFor([12]).length, 10);
assert.equal(scienceFor([3,10]).length, 6, "mixed-grade filters show high-school options once");
assert.equal(scienceFor([]).length, 10, "all grades show each eligible choice once");
const chemistry = plans.get(science.tags[0].courseIds[0]);
assert.ok(chemistry && matchesCourseGrades(chemistry,[9,11]));
assert.equal(matchesCourseGrades({grades:[7],gradeDisplay:"GRADES: 7+"},[11]),true,
  "grade+ works for choice and non-choice courses alike");
assert.equal(matchesCourseGrades({grades:[10],gradeDisplay:"GRADES: 10-12"},[9]),false);

assert.ok(tsx.includes("matchesCourseGrades(course, grades)"));
assert.ok(tsx.includes("matchesCourseGrades(option.course, grades)"));
assert.ok(!tsx.includes("group.grades"), "group tags do not impose a second grade filter");
assert.ok(tsx.includes("const tagOptions = new Map<string,ChoiceOption>()"));
assert.ok(tsx.includes("tagOptions.get(id)"), "shared course IDs deduplicate within parent group");
assert.ok(tsx.includes("sort: options[0].course.presentationSort"),
  "choice heading follows earliest visible matching course");
assert.ok(tsx.includes('className="cx-choice-tag"'), "authored tag labels appear on course titles");
assert.ok(!tsx.includes("choiceNumber") && !tsx.includes("optionNumbers"),
  "obsolete numbered options have been removed");
assert.ok(tsx.includes("cx-status-") && tsx.includes("cx-context-"),
  "student/Think Tank status coloring remains intact");

assert.ok(css.includes("background:#f0f1ed;"),"neutral choice heading");
assert.ok(!css.includes("border-left:2px solid #dde2d9;") &&
  !css.includes("border-bottom:2px solid #d1d8ce;"),
  "choice groups have no extra left or bottom outline");
assert.ok(css.includes(".cx-choice + .cx-course,") &&
  css.includes(".cx-choice + .cx-choice { border-top:1px solid #d3d9c2; }"),
  "only an ordinary row divider separates the next group or Latin 3/4");
assert.ok(css.includes(".cx-choice-header {") &&
  css.includes("background:#f0f1ed;"),
  "neutral headers stay visible without box borders");
assert.ok(css.includes(".cx-choice-tag {") && css.includes("background:#f3f4f1;"));
assert.ok(!css.includes("background:#303631;") && !css.includes("border:2px solid #434a45;"),
  "dark charcoal group boxes are gone");
assert.ok(css.includes("box-shadow:inset 3px 0 0 var(--cx-subject);"),
  "the selected-course subject rail stays visible");
assert.ok(deskCss.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"),
  "Think Tank details-only subject rail remains unchanged");

const parsed = guidanceSegments(science.guidance);
const realLink = parsed.find(p => p.kind === "link");
assert.ok(realLink);
assert.equal(realLink.text,"high school science placement guide");
assert.equal(realLink.href,
  "https://drive.google.com/file/d/1hH5tEEXGK7vnimhxzbAPOH0_5OkLvdYe/view");
assert.ok(tsx.includes('rel="noopener noreferrer"'), "external links open safely");
assert.ok(!tsx.includes("dangerouslySetInnerHTML"), "Airtable guidance isn't interpreted as HTML");
assert.deepEqual(guidanceSegments("[bad](javascript:alert(1))"),
  [{kind:"text",text:"[bad](javascript:alert(1))"}]);
assert.deepEqual(guidanceSegments("Plain text"),[{kind:"text",text:"Plain text"}]);
console.log("Choice groups: normal grades, deduplicated courses, neutral tags, links and selected rails: OK");
