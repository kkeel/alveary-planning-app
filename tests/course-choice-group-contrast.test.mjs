import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const explorer = read("app/courses/CourseExplorer.tsx");
const css = read("app/courses/course-explorer.css");
const deskCss = read("app/components/planning-desk.css");
const catalog = JSON.parse(read("app/courses/catalog-preview.json"));

// Choice numbers are optional root-course decorations. Topics never inherit
// them, and the badge appears directly beside the course's own title.
assert.ok(explorer.includes("choiceNumber?: number;"));
assert.ok(explorer.includes('className="cx-course-name">{course.title}'));
assert.match(explorer,
  /choiceNumber !== undefined && !nested &&[\s\S]*?className="cx-choice-number">Choice \{choiceNumber\}/,
  "Each numbered badge should sit next to its own root course title");
assert.ok(explorer.includes("choiceNumber={row.optionNumbers.get(option.id)}"),
  "Choice-group option numbers must be supplied to CourseRow");

// Number the FULL display order BEFORE applying search text. A search that
// leaves only Choice 2 must not relabel it Choice 1.
assert.ok(explorer.includes("const orderedOptions = [...allOptions].sort(comparePlan);"));
assert.ok(explorer.includes("new Map<string,number>("));
assert.ok(explorer.includes("orderedOptions.map((option,index): [string,number] => [option.id,index + 1])"));
assert.ok(explorer.includes("orderedOptions.filter(matchesText)"));

const latin = catalog.choiceGroups.find(g => g.title === "Latin Choices: Level 1");
assert.ok(latin);
const options = latin.courseIds.map(id => catalog.courses.find(c => c.id === id));
assert.ok(options.every(Boolean));
const compare = (a,b) =>
  a.presentationSort.localeCompare(b.presentationSort) ||
  a.sort.localeCompare(b.sort) || a.id.localeCompare(b.id);
const ordered = [...options].sort(compare);
const numbers = new Map(ordered.map((option,index) => [option.id,index + 1]));
const selected = ordered.filter(option => option.title.includes("Video Course"));
assert.equal(selected.length,1);
assert.equal(numbers.get(selected[0].id),2,
  "A filtered second choice must keep its original visible ordinal");

// The group heading should stand apart in Alveary charcoal, not use
// another subject color. Choices use neutral outline/text badges.
assert.ok(css.includes("border:2px solid #434a45;"));
assert.ok(css.includes(".cx-choice--accent .cx-choice-header { background:#303631; }"));
assert.ok(css.includes("color:#fff;"));
assert.match(css,
  /\.cx-choice-number\s*\{[\s\S]*?background:#eef0ee;[\s\S]*?color:#424944;/,
  "Choice number badges must stay neutral rather than subject-colored");
assert.ok(css.includes(".cx-choice-header h3, .cx-choice-header p { color:#171a18 !important; }"),
  "The print stylesheet should keep text legible on the light printed header");

// Only slight subject inset: don't bring back outlined subject cards.
assert.match(deskCss,
  /\.pd-desk \.pd-subject-list\s*\{\s*width:100%;\s*padding-inline:6px;/);
assert.ok(deskCss.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"));
assert.ok(deskCss.includes(".pd-think-course-list > .pd-idea + .pd-idea"));
console.log("Choice group charcoal palette and stable numbered options: OK");
