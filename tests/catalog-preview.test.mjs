import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sortTopicsForCourse } from "../app/courses/topic-order.mjs";
import { matchesCountry } from "../app/courses/country-filter.mjs";

const data = JSON.parse(readFileSync(new URL("../app/courses/catalog-preview.json", import.meta.url), "utf8"));
const rows = data.courses;
const courseRows = rows.filter(r => r.type !== "Topic");
const topicRows = rows.filter(r => r.type === "Topic");
const byPlan = new Map(rows.map(r => [r.id, r]));
const byEdition = new Map(rows.map(r => [r.editionId, r]));
const childEditionIds = new Set(data.topicLinks.map(link => link.childEditionId));

assert.equal(data.releaseYear, "2027-28");
assert.equal(data.sourceEditionCount, 377, "the full intended 2027–28 Primary set is present");
assert.equal(rows.length, 377);
assert.equal(courseRows.length, 184);
assert.equal(topicRows.length, 193);
assert.equal(byPlan.size, 377);
assert.equal(byEdition.size, 377);
assert.equal(data.topicLinks.length, 308, "only valid within-snapshot topic connections are exported");
assert.ok(topicRows.every(row => childEditionIds.has(row.editionId)), "all 193 topics must be linked within at least one course");
assert.ok(rows.every(row => row.title && row.sort && row.subject && Array.isArray(row.grades)));
assert.ok(data.topicLinks.every(link => byEdition.has(link.parentEditionId) && byEdition.has(link.childEditionId)));
assert.equal(data.choiceGroups.length, 4);
assert.equal(data.choiceGroups.reduce((sum, group) => sum + group.courseIds.length, 0), 8);
// Country filtering is inclusive: "Both" offerings must remain visible in
// either regional view. Country never modifies the underlying course records.
const countryCounts = courseRows.reduce((acc, row) => {
  acc[row.country] = (acc[row.country] || 0) + 1;
  return acc;
}, {});
assert.deepEqual(countryCounts, {Both:151,"U.S.":16,Canada:17});
const usCourses = courseRows.filter(row => matchesCountry(row.country, "us"));
const canadaCourses = courseRows.filter(row => matchesCountry(row.country, "canada"));
assert.equal(usCourses.length, 167);
assert.equal(canadaCourses.length, 168);
assert.equal(courseRows.filter(row => matchesCountry(row.country, "all")).length, 184);
assert.ok(usCourses.every(row => row.country === "Both" || row.country === "U.S."));
assert.ok(canadaCourses.every(row => row.country === "Both" || row.country === "Canada"));
for (const subject of ["History", "Geography", "Citizenship"]) {
  const subset = courseRows.filter(row => row.subject === subject);
  assert.ok(subset.some(row => row.country === "U.S."));
  assert.ok(subset.some(row => row.country === "Canada"));
  assert.ok(subset.filter(row => matchesCountry(row.country, "us")).every(row => row.country !== "Canada"));
  assert.ok(subset.filter(row => matchesCountry(row.country, "canada")).every(row => row.country !== "U.S."));
}
assert.equal(matchesCountry(null, "us"), false, "country-unknown courses should not be assumed eligible");
assert.equal(matchesCountry("Both", "canada"), true);
assert.equal(matchesCountry("Both", "us"), true);
assert.equal(matchesCountry("Canada", "all"), true);
// Current Active Choice Group options are all valid for either country; if
// country-specific options are added later the same predicate still applies.
for (const group of data.choiceGroups) {
  assert.ok(group.courseIds.every(id => byPlan.has(id) && matchesCountry(byPlan.get(id).country, "us")));
  assert.ok(group.courseIds.every(id => byPlan.has(id) && matchesCountry(byPlan.get(id).country, "canada")));
}

const grouped = data.choiceGroups.flatMap(group => group.courseIds);
assert.equal(new Set(grouped).size, 7, "Advanced Nature Study appears in both grade-specific groups");
assert.ok(grouped.every(id => byPlan.has(id) && byPlan.get(id).type !== "Topic"), "choice options are courses, never topics");
assert.ok(data.choiceGroups.every(group => group.grades.length > 0));
assert.ok(rows.every(row => !("edition_development_notes" in row) && !("pdf_url" in row) && !("member_id" in row)),
  "static public preview must not bundle internal lesson notes or private member data");
// Edition-specific schedules are real Airtable recommendations; preserve every
// option when an edition has multiple grade-band or lesson-time assignments.
const recommendations = rows.flatMap(row => row.schedules || []);
assert.equal(recommendations.length, 298, "full edition-specific schedule relationships imported");
assert.equal(rows.filter(row => row.schedules?.length).length, 268, "scheduled Primary edition coverage");
assert.equal(new Set(recommendations.map(row => row.id)).size, 98, "shared scheduling records are canonical");
assert.ok(recommendations.every(row => row.text && row.id), "all schedule labels remain intact");
assert.ok(rows.every(row => typeof row.gradeDisplay === "string" && row.gradeDisplay.length > 0),
  "the exact Airtable grade label should be preserved, including grade +");
assert.equal(rows.find(row => row.title === "Art: Level 1")?.gradeDisplay, "GRADES: 1+");

const sort = (a, b) => a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0;
const linked = new Map();
for (const link of data.topicLinks) {
  const children = linked.get(link.parentEditionId) || [];
  children.push(byEdition.get(link.childEditionId));
  linked.set(link.parentEditionId, children);
}
for (const children of linked.values()) {
  const inPlanSortOrder = [...children].sort(sort);
  for (let i = 1; i < inPlanSortOrder.length; i++) {
    assert.ok(sort(inPlanSortOrder[i - 1], inPlanSortOrder[i]) <= 0,
      "topic order must use source Plan Sort rather than titles or link order");
  }
}
// Topic order is contextual to a particular combined course, not a global
// mutation of the shared topic's Plan Sort or presentation sort.
let citizenshipOutlines = 0;
let otherOutlines = 0;
for (const course of rows.filter(row => row.type === "Combined Course")) {
  const originals = linked.get(course.editionId) || [];
  const ordered = sortTopicsForCourse(course, originals);
  assert.equal(ordered.length, originals.length, "no connected topic may be dropped");
  assert.deepEqual(new Set(ordered.map(row => row.id)), new Set(originals.map(row => row.id)));
  if (course.subject === "Citizenship") {
    citizenshipOutlines++;
    const community = ordered.findIndex(row => row.title.startsWith("Community Read Alouds"));
    const events = ordered.findIndex(row => row.title.startsWith("Current Events"));
    if (community !== -1) assert.equal(community, ordered.length - 1, "Community Read Alouds last in Citizenship");
    if (events !== -1) assert.equal(events, ordered.length - (community === -1 ? 1 : 2),
      "Current Events second-last in Citizenship when Community Read Alouds is present");
    assert.ok(ordered.slice(0,Math.max(0,ordered.length-2)).every(row =>
      !row.title.startsWith("Current Events") && !row.title.startsWith("Community Read Alouds")),
      "regular Citizenship topics appear before the two special endings");
  } else {
    otherOutlines++;
    const expected = [...originals].sort(sort);
    assert.deepEqual(ordered.map(row => row.editionId), expected.map(row => row.editionId),
      "other subjects stay ordered by their source Plan Sort");
  }
}
assert.equal(citizenshipOutlines,14);
assert.equal(otherOutlines,89);

// Guard future curriculum topics: no hard-coded edition IDs or year-specific
// links. New topic editions with these title families obey the same rule.
const synthetic = [
  {id:"a",title:"Community Read Alouds: New Edition",sort:"10105019-500"},
  {id:"b",title:"Ethics: New Topic",sort:"4104049-500"},
  {id:"c",title:"Current Events: New Grades",sort:"4105049-500"},
  {id:"d",title:"Plutarch: New Topic",sort:"4101049-500"},
];
const asCitizenship = sortTopicsForCourse({subject:"Citizenship"}, synthetic);
assert.deepEqual(asCitizenship.map(row=>row.id),["d","b","c","a"]);
const asLiterature = sortTopicsForCourse({subject:"Literature"}, synthetic);
assert.deepEqual(asLiterature.map(row=>row.id),["a","d","b","c"],
  "Community Read Alouds keeps original sort when used in Literature");
assert.deepEqual(synthetic.map(row=>row.id),["a","b","c","d"], "sorting must never mutate shared source records");

// Source Plan Sort remains untouched; member-facing sort is edition/year-specific.
const firstGrade = plan => Math.min(...plan.grades);
const paddedGrade = plan => String(firstGrade(plan)).padStart(2, "0");
const countryRank = plan => plan.country === "U.S." ? "1" : plan.country === "Canada" ? "2" : "0";
function expectedAppSort(plan, base) {
  if (plan.type === "Topic") return base;
  const prefix = base.slice(0, 2);
  if (plan.subject === "Citizenship" && plan.title === "Plutarch: Beginner Track") return prefix + "Z" + base;
  if (["Citizenship", "History"].includes(plan.subject)) {
    return prefix + "G" + paddedGrade(plan) + "C" + countryRank(plan) + "-" + base;
  }
  if (plan.subject === "Math") {
    if (plan.title.startsWith("Story of ")) return prefix + "Z" + paddedGrade(plan) + "-" + base;
    const rank = plan.title.startsWith("RightStart Math:") ? "10"
      : plan.title.startsWith("Beast Academy Math:") ? "20"
      : plan.title.startsWith("Mathematics:") ? "25"
      : plan.title.startsWith("Denison") ? "30" : "40";
    return prefix + "G" + paddedGrade(plan) + "P" + rank + "-" + base;
  }
  if (plan.subject === "Modern Language") {
    const language = plan.title.includes("Spanish") ? "1"
      : plan.title.includes("French") ? "2" : "9";
    return prefix + "L" + language + "G" + paddedGrade(plan) + "-" + base;
  }
  return base;
}
let anchoredCombined = 0;
let crossSubjectCourses = 0;
let subjectSpecificCourses = 0;
for (const course of rows) {
  assert.ok(course.presentationSort && typeof course.presentationSort === "string",
    "every edition has an app presentation sort");
  const children = linked.get(course.editionId) || [];
  const sameSubject = children.filter(child => child.subject === course.subject);
  if (course.type === "Combined Course" && sameSubject.length !== children.length) crossSubjectCourses++;
  const anchor = course.type === "Combined Course" && sameSubject.length
    ? [...sameSubject].map(child => child.sort).sort()[0]
    : course.sort;
  assert.equal(course.presentationSort, expectedAppSort(course, anchor),
    "edition app sort must follow same-subject topic anchors and subject rules");
  if (course.type === "Combined Course" && anchor !== course.sort) anchoredCombined++;
  if (course.type !== "Topic" &&
      ["Citizenship", "History", "Math", "Modern Language"].includes(course.subject)) {
    subjectSpecificCourses++;
  }
}
assert.equal(anchoredCombined, 103);
assert.equal(crossSubjectCourses, 14);
assert.equal(subjectSpecificCourses, 66);
assert.ok(rows.filter(row => row.type === "Topic").every(row => row.presentationSort === row.sort),
  "all topic source order values remain unchanged");

const orderedTitles = subject => rows
  .filter(row => row.subject === subject && row.type !== "Topic")
  .sort((a,b) => a.presentationSort.localeCompare(b.presentationSort) ||
    a.sort.localeCompare(b.sort) || a.title.localeCompare(b.title))
  .map(row => row.title);

const citizenship = orderedTitles("Citizenship");
assert.equal(citizenship.at(-1), "Plutarch: Beginner Track", "Plutarch Beginner must be last in Citizenship");
for (const grade of [7, 8, 9, 10, 11]) {
  const us = citizenship.findIndex(title => title.includes("Grade " + grade + " (U.S.)"));
  const ca = citizenship.findIndex(title => title.includes("Grade " + grade + " (Canada)"));
  assert.ok(us !== -1 && ca === us + 1, "Citizenship U.S./Canada must be adjacent, U.S. first: " + grade);
}
const history = orderedTitles("History");
for (const [us, ca] of [
  ["History: Grade 1 (U.S.)", "History: Grade 1 (Canada)"],
  ["History: Grades 2-3 (U.S.)", "History: Grades 2-3 (Canada)"],
  ["History: Grade 4 (U.S.)", "History: Grade 4 (Canada)"],
  ["History: Grades 5-6 (U.S.)", "History: Grades 5-6 (Canada)"],
  ["History: Grades 7-8 (U.S.)", "History: Grades 7-8 (Canada)"],
  ["History: Grade 9 (U.S.)", "History: Grade 9 (Canada)"],
  ["History: Grades 10-12 (U.S.)", "History: Grade 10 (Canada)"]
]) {
  const at = history.indexOf(us);
  assert.ok(at >= 0 && history[at+1] === ca, "History paired country order failed: " + us);
}
const math = orderedTitles("Math");
for (const grade of [1,2,3,4,5]) {
  assert.ok(math.indexOf("RightStart Math: Grade " + grade) < math.indexOf("Beast Academy Math: Grade " + grade),
    "RightStart should precede Beast Academy for grade " + grade);
}
for (const grade of [7,8]) {
  assert.ok(math.indexOf("RightStart Math: Grade " + grade) < math.indexOf("Denison Math: Grade " + grade));
}
for (const grade of [9,10,11]) {
  const other = math.findIndex(x => x === "Mathematics: Grade " + grade);
  const denison = math.findIndex(x => x.startsWith("Denison") && x.endsWith("Grade " + grade));
  assert.ok(denison > other, "Denison should follow other traditional math within grade " + grade);
}
const lastTraditional = Math.max(...math.map((name,i) => name.startsWith("Story of ") ? -1 : i));
assert.ok(math.every((name,i) => !name.startsWith("Story of ") || i > lastTraditional),
  "Every Story of... math option belongs after traditional math");
const modern = orderedTitles("Modern Language");
const firstFrench = modern.findIndex(name => name.includes("French"));
assert.ok(firstFrench >= 0 && modern.slice(0,firstFrench).every(x=>x.includes("Spanish")) &&
  modern.slice(firstFrench).every(x=>x.includes("French")), "Spanish should all precede French");
const shakespeare = orderedTitles("Literature").filter(name => name.startsWith("Shakespeare:"));
assert.deepEqual(shakespeare, ["Shakespeare: Beginner Track", "Shakespeare: Grades 5-8"],
  "Keep Shakespeare Beginner Track first");

const groupedSourceIds = new Set(data.choiceGroups.flatMap(group => group.courseIds));
assert.ok(groupedSourceIds.has(rows.find(row => row.title === "Science: Advanced Nature Study")?.id));
assert.equal(data.choiceGroups.some(group => group.guidance !== null && !group.guidance.trim()), false);
const art = rows.find(row => row.title === "Art: Level 1");
assert.ok(art?.description && art.tips, "real source descriptions and placement guidance must be present");
console.log("PASS: 377 editions, topic ordering and inclusive U.S./Canada course filters (184 course choices).");
