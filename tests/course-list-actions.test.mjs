import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sourceChoiceForRow } from "../app/courses/course-list-actions.mjs";
import { canOpenListStudentEditor } from "../app/courses/list-editor-readiness.mjs";
import { previewTopicsForCourse } from "../app/courses/optimistic-topics.mjs";
import { savedTopicContexts } from "../app/components/shared-topic-contexts.mjs";

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
// A newly prepared parent is inserted optimistically before the serialized
// prepare_plan response. Its topics come from the public Course List catalog,
// so both + All and nested + can open instantly while backend writes queue.
const optimisticParent = {
  courseId: single.id, stage: "idea", ideaAll: false,
  topics: [], studentIds: [], overrides: [],
};
assert.equal(canOpenListStudentEditor(undefined, single.type),false,
  "no parent choice means no student editor yet");
assert.equal(canOpenListStudentEditor(optimisticParent, single.type),true,
  "single-topic + must open the student editor immediately");
assert.equal(canOpenListStudentEditor(optimisticParent, g9.type),false,
  "a parent with genuinely unknown links must still wait for topic data");
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

const g78 = byTitle.get("History: Grades 7-8 (U.S.)");
assert.ok(g78);
const previewCombined = {
  courseId: g78.id, stage: "idea", ideaAll: false,
  topics: previewTopicsForCourse(catalog,g78.id),
  studentIds: [], overrides: [],
};
assert.equal(previewCombined.topics.length,3);
assert.equal(canOpenListStudentEditor(previewCombined,g78.type),true,
  "fresh combined + All should open on the same click using catalog topic links");
const previewGradeNine = {
  courseId:g9.id,stage:"idea",ideaAll:false,
  topics:previewTopicsForCourse(catalog,g9.id),
  studentIds:[],overrides:[],
};
assert.equal(canOpenListStudentEditor(previewGradeNine,"Topic",true),true,
  "nested + opens instantly with the source parent's public topic links");
assert.ok(previewGradeNine.topics.some(t=>
  t.topicId===us9.id && t.topicEditionId===us9.editionId && t.included),
  "the instant editor preserves the exact shared source edition in its parent");
const crossContexts=savedTopicContexts([previewCombined,previewGradeNine],us9.editionId);
assert.ok(crossContexts.some(context=>context.courseId===g9.id),
  "the parent context is available to the instant nested editor");
const source = readFileSync(new URL("../app/components/DemoPlanContext.tsx",import.meta.url),"utf8");
assert.match(source,/prepareListPlan[\s\S]*?previewTopicsForCourse\(catalog,courseId\)/,
  "optimistic prepare_plan must hydrate its topics from the catalog");
assert.match(source,/chain\.current\.catch\(\(\) => undefined\)\.then\(\(\) => request\(action, fields\)\)/,
  "dependent assignments are serialized behind prepare_plan");
