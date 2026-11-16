import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { subjectColor, subjectColors } from "../app/courses/legacy-subject-colors.mjs";
import { listRowStatus } from "../app/courses/list-row-status.mjs";
import { sourceChoiceForRow } from "../app/courses/course-list-actions.mjs";

const catalog=JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json",import.meta.url),"utf8"));
const byTitle=new Map(catalog.courses.map(c=>[c.title,c]));
const byEdition=new Map(catalog.courses.map(c=>[c.editionId,c]));
const grade9=byTitle.get("History: Grade 9 (U.S.)");
const grade1012=byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(grade9 && grade1012);
const people=[{id:"AJ"},{id:"Troy"},{id:"Hannah"}];
const makeCourse=p=>({
  courseId:p.id,stage:"idea",studentIds:[],overrides:[],
  topics:catalog.topicLinks.filter(link=>link.parentEditionId===p.editionId)
    .map(link=>{const child=byEdition.get(link.childEditionId);
      return {topicId:child.id,topicEditionId:child.editionId,included:true};
    }),
});
const p9=makeCourse(grade9),p1012=makeCourse(grade1012);
const us9=p9.topics.find(t=>byEdition.get(t.topicEditionId).title.startsWith("U.S. History:"));
const us1012=p1012.topics.find(t=>t.topicEditionId===us9.topicEditionId);
const ancient=p9.topics.find(t=>byEdition.get(t.topicEditionId).title.startsWith("Ancient History"));
assert.ok(us9 && us1012 && ancient);

const unsaved=listRowStatus(undefined,people,null,true,false);
assert.equal(unsaved.saved,false);
assert.equal(unsaved.ideaActive,false);
assert.equal(unsaved.planActive,false);
assert.equal(unsaved.planTone,"none");

const draft=listRowStatus(p9,people,null,true,true);
assert.equal(draft.saved,true);
assert.equal(draft.ideaActive,true,"saved idea colors its lightbulb");
assert.equal(draft.planTone,"none","a saved idea is not automatically assigned");
const ideaChild=listRowStatus(p9,people,us9.topicId,false,true);
assert.equal(ideaChild.ideaActive,true,"topic in an idea remains available in Think Tank");
assert.equal(ideaChild.contextTone,"inherited","child of a saved idea gets a light tint");

p9.stage="planned";
p9.overrides.push({topicId:us9.topicId,studentId:"AJ",assigned:true});
const parentPartial=listRowStatus(p9,people,null,true,true);
const childDirect=listRowStatus(p9,people,us9.topicId,false,true);
const unchosen=listRowStatus(p9,people,ancient.topicId,false,true);
assert.equal(parentPartial.planTone,"partial",
  "a combined parent with only one assigned topic gets the light color");
assert.equal(parentPartial.ideaActive,false,
  "planned combined parent no longer appears as a saturated Think Tank idea");
assert.equal(childDirect.planTone,"full",
  "directly assigned topic receives saturated subject color");
assert.equal(childDirect.ideaActive,false,
  "directly planned topic no longer colors Think Tank bulb");
assert.equal(unchosen.planActive,false,
  "other included topics remain unplanned");
assert.equal(unchosen.ideaActive,true,
  "unassigned topics remain available in Think Tank");

p1012.stage="planned";
p1012.overrides.push({topicId:us1012.topicId,studentId:"Troy",assigned:true});
const separate=listRowStatus(p1012,people,us1012.topicId,false,true);
assert.equal(separate.planTone,"full");
p9.overrides[0].assigned=false;
assert.equal(listRowStatus(p9,people,us9.topicId,false,true).planActive,false,
  "removing AJ in Grade 9 never changes Troy's other History parent");
assert.equal(listRowStatus(p1012,people,us1012.topicId,false,true).planActive,true);
assert.notDeepEqual(sourceChoiceForRow(us9.topicId,grade9.id),
  sourceChoiceForRow(us1012.topicId,grade1012.id),
  "the same source edition is always scoped to the selected combined parent");

const whole=makeCourse(grade9);
whole.stage="planned";whole.studentIds.push("AJ");
assert.equal(listRowStatus(whole,people,null,true,true).planTone,"full",
  "+All marks the combined course as a direct, saturated selection");
assert.equal(listRowStatus(whole,people,us9.topicId,false,true).planTone,"inherited",
  "a topic included through +All gets a lighter color");
whole.overrides.push({topicId:ancient.topicId,studentId:"AJ",assigned:false});
assert.equal(listRowStatus(whole,people,ancient.topicId,false,true).planTone,"none",
  "a negative exception must not look planned even under +All");
const single=catalog.courses.find(c=>c.type==="Single-Topic Course");
assert.ok(single);
const singleChoice={courseId:single.id,stage:"planned",studentIds:["AJ"],overrides:[],
  topics:[{topicId:single.id,included:true}]};
assert.equal(listRowStatus(singleChoice,people,null,false,true).planTone,"full");

for(const [subject,expected] of Object.entries({
  "History":"#6b6bbf","Literature":"#c07669","Math":"#6d7eaa",
  "English":"#9b5b7b","Science":"#96a767","Citizenship":"#62765c",
  "Modern Language":"#6db4b2","Life Skills":"#d1b358",
})){
  assert.equal(subjectColor(subject),expected,subject+" original subject palette");
  assert.equal(subjectColors[subject],expected);
}
assert.equal(subjectColor("LITERATURE"),subjectColors["Literature"]);
console.log("PASS: quiet List indicators use original subject colors and exact combined parent/topic selection states.");
