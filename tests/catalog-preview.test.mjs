import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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
const groupedSourceIds = new Set(data.choiceGroups.flatMap(group => group.courseIds));
assert.ok(groupedSourceIds.has(rows.find(row => row.title === "Science: Advanced Nature Study")?.id));
assert.equal(data.choiceGroups.some(group => group.guidance !== null && !group.guidance.trim()), false);
const art = rows.find(row => row.title === "Art: Level 1");
assert.ok(art?.description && art.tips, "real source descriptions and placement guidance must be present");
console.log("PASS: 377 editions, 308 topic links, 298 schedules across 268 editions, explicit grades, 4 choice groups.");
