import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceChoiceForRow } from "../app/courses/course-list-actions.mjs";

const catalog = JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json", import.meta.url),"utf8"
));
const byTitle = new Map(catalog.courses.map(c=>[c.title,c]));
const byEdition = new Map(catalog.courses.map(c=>[c.editionId,c]));
const g9 = byTitle.get("History: Grade 9 (U.S.)");
const g1012 = byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(g9 && g1012);
const childLinks = parent => catalog.topicLinks.filter(t => t.parentEditionId === parent.editionId);
const findUS = parent => childLinks(parent)
  .map(t => byEdition.get(t.childEditionId))
  .find(t => t?.title === "U.S. History: Grades 9-12");
const us9 = findUS(g9), us1012 = findUS(g1012);
assert.ok(us9 && us1012);
assert.equal(us9.editionId,us1012.editionId);

assert.deepEqual(sourceChoiceForRow(g9.id),{courseId:g9.id,topicId:null},
  "Plan all saves the parent course without a nested topic override");
assert.deepEqual(sourceChoiceForRow(us9.id,g9.id),
  {courseId:g9.id,topicId:us9.id},
  "a nested topic must be assigned through its Grade 9 parent, not standalone");
assert.deepEqual(sourceChoiceForRow(us1012.id,g1012.id),
  {courseId:g1012.id,topicId:us1012.id},
  "the same edition inside Grades 10-12 has independent parent provenance");
assert.notDeepEqual(sourceChoiceForRow(us9.id,g9.id),
  sourceChoiceForRow(us1012.id,g1012.id));
assert.deepEqual(sourceChoiceForRow(g1012.id),{courseId:g1012.id,topicId:null});

const single = catalog.courses.find(c=>c.type==="Single-Topic Course");
assert.ok(single);
assert.deepEqual(sourceChoiceForRow(single.id),{courseId:single.id,topicId:null},
  "direct Plan on a single-topic course uses the ordinary course assignment");
console.log("PASS: member Course List Plan/Think Tank actions preserve saved parent and nested topic context.");
