import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceChoiceForRow } from "../app/courses/course-list-actions.mjs";
import { canOpenListStudentEditor } from "../app/courses/list-editor-readiness.mjs";

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
// The new saved parent is inserted optimistically before the serialized
// prepare_plan network response. A single-topic course already identifies
// what is being assigned: its student editor should never wait on topic
// hydration. Combined/nested contexts still must wait for topic links.
const optimisticParent = {
  courseId: single.id, stage: "idea", ideaAll: false,
  topics: [], studentIds: [], overrides: [],
};
assert.equal(canOpenListStudentEditor(undefined, single.type),false,
  "no parent choice means no student editor yet");
assert.equal(canOpenListStudentEditor(optimisticParent, single.type),true,
  "single-topic + must open the student editor immediately");
assert.equal(canOpenListStudentEditor(optimisticParent, g9.type),false,
  "combined +All must continue waiting for its verified topic links");
assert.equal(canOpenListStudentEditor(optimisticParent, "Topic",true),false,
  "nested + must not bypass parent-topic membership verification");
const hydratedParent = {...optimisticParent, topics:[
  {topicId:single.id, topicEditionId:single.editionId, included:true},
]};
assert.equal(canOpenListStudentEditor(hydratedParent,single.type),true);
const hydratedCombined = {courseId:g9.id, topics:[{topicId:us9.id,included:true}]};
assert.equal(canOpenListStudentEditor(hydratedCombined,g9.type),true);
assert.equal(canOpenListStudentEditor(hydratedCombined,"Topic",true),true);

console.log("PASS: member Course List Plan/Think Tank actions preserve saved parent and nested topic context.");
console.log("PASS: single-topic + Plan opens before topic hydration; combined/nested safeguards remain.");
