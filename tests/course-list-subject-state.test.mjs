import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { subjectColor, subjectColors } from "../app/courses/legacy-subject-colors.mjs";
import {
  listRowStatus, pendingIdeaCount, topicIsThinkTankIdea,
} from "../app/courses/list-row-status.mjs";
import { sourceChoiceForRow } from "../app/courses/course-list-actions.mjs";

const catalog=JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json",import.meta.url),"utf8"));
const byTitle=new Map(catalog.courses.map(c=>[c.title,c]));
const byEdition=new Map(catalog.courses.map(c=>[c.editionId,c]));
const g9=byTitle.get("History: Grade 9 (U.S.)");
const g1012=byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(g9&&g1012);
const people=[{id:"AJ"},{id:"Troy"},{id:"Hannah"}];
const make=p=>({
 courseId:p.id,stage:"idea",ideaAll:false,studentIds:[],overrides:[],
 topics:catalog.topicLinks.filter(l=>l.parentEditionId===p.editionId)
 .map(l=>{const t=byEdition.get(l.childEditionId);
  return {topicId:t.id,topicEditionId:t.editionId,included:true,ideaChoice:"inherit"};
 }),
});
const grade9=make(g9),older=make(g1012);
const us=grade9.topics.find(t=>byEdition.get(t.topicEditionId).title.startsWith("U.S. History:"));
const shared=older.topics.find(t=>t.topicEditionId===us.topicEditionId);
const ancient=grade9.topics.find(t=>byEdition.get(t.topicEditionId).title.startsWith("Ancient History"));
assert.ok(us&&shared&&ancient);

const state=(c,t=null)=>listRowStatus(c,people,t,true,true);
assert.equal(listRowStatus(undefined,people,null,true,false).ideaTone,"none");
assert.equal(listRowStatus(undefined,people,null,true,false).planTone,"none");

// Clicking a COURSE bulb is the originating direct choice:
// parent saturated; ALL child bulbs light, not individually saturated.
const allIdea=structuredClone(grade9);
allIdea.ideaAll=true;
assert.equal(state(allIdea).ideaTone,"full");
for(const topic of allIdea.topics) {
 assert.equal(state(allIdea,topic.topicId).ideaTone,"inherited");
 assert.equal(state(allIdea,topic.topicId).planTone,"none");
}
assert.equal(pendingIdeaCount(allIdea,people),allIdea.topics.length);

// Clicking only a TOPIC bulb creates one direct idea; the course is pale,
// the chosen topic saturated, and the other topics completely neutral.
const topicIdea=structuredClone(grade9);
topicIdea.topics.find(t=>t.topicId===us.topicId).ideaChoice="on";
assert.equal(state(topicIdea).ideaTone,"partial");
assert.equal(state(topicIdea,us.topicId).ideaTone,"full");
for(const topic of topicIdea.topics.filter(t=>t.topicId!==us.topicId))
 assert.equal(state(topicIdea,topic.topicId).ideaTone,"none");
assert.equal(pendingIdeaCount(topicIdea,people),1);
assert.equal(topicIsThinkTankIdea(topicIdea,ancient.topicId,people),false);

// Toggling the exact same topic off returns it to neutral WITHOUT adding
// its siblings, and does not require deleting its saved parent.
topicIdea.topics.find(t=>t.topicId===us.topicId).ideaChoice="inherit";
assert.equal(state(topicIdea,us.topicId).ideaTone,"none");
assert.equal(state(topicIdea).ideaTone,"none");
assert.equal(pendingIdeaCount(topicIdea,people),0);

// Starting at TOPIC + creates only one planned topic. The parent +All is
// light, the directly planned child + is saturated, untouched siblings
// have no colored bulb or plus whatsoever.
const topicPlan=structuredClone(grade9);
topicPlan.stage="planned";
topicPlan.overrides.push({topicId:us.topicId,studentId:"AJ",assigned:true});
assert.equal(state(topicPlan).planTone,"partial");
assert.equal(state(topicPlan).ideaTone,"none");
assert.equal(state(topicPlan,us.topicId).planTone,"full");
assert.equal(state(topicPlan,us.topicId).ideaTone,"none");
for(const topic of topicPlan.topics.filter(t=>t.topicId!==us.topicId)){
 assert.equal(state(topicPlan,topic.topicId).planTone,"none");
 assert.equal(state(topicPlan,topic.topicId).ideaTone,"none");
}
assert.equal(pendingIdeaCount(topicPlan,people),0,
 "starting with topic + must not auto-add sibling topics to Think Tank");

// Starting at COURSE +All is the reciprocal: saturated parent +All,
// lightly-colored + buttons for ALL included children.
const allPlan=structuredClone(grade9);
allPlan.stage="planned";
allPlan.studentIds.push("AJ");
assert.equal(state(allPlan).planTone,"full");
assert.equal(state(allPlan).ideaTone,"none");
for(const topic of allPlan.topics){
 assert.equal(state(allPlan,topic.topicId).planTone,"inherited");
 assert.equal(state(allPlan,topic.topicId).ideaTone,"none");
}

// Direct Think Tank topic and Plan topic can coexist under one parent,
// without displaying unrelated siblings in either column.
const mixed=structuredClone(topicPlan);
mixed.topics.find(t=>t.topicId===ancient.topicId).ideaChoice="on";
assert.equal(state(mixed).planTone,"partial");
assert.equal(state(mixed).ideaTone,"partial");
assert.equal(state(mixed,us.topicId).planTone,"full");
assert.equal(state(mixed,ancient.topicId).ideaTone,"full");
assert.equal(pendingIdeaCount(mixed,people),1);

// Removing all students from a topic returns just that child as a direct
// Think Tank idea, leaving the sibling parent untouched.
const removed=structuredClone(topicPlan);
removed.stage="idea";
removed.overrides[0].assigned=false;
removed.topics.find(t=>t.topicId===us.topicId).ideaChoice="on";
assert.equal(state(removed).planTone,"none");
assert.equal(state(removed).ideaTone,"partial");
assert.equal(state(removed,us.topicId).ideaTone,"full");
assert.equal(pendingIdeaCount(removed,people),1);

// Shared U.S. History edition must not borrow status between grade contexts.
older.stage="planned";
older.overrides.push({topicId:shared.topicId,studentId:"Troy",assigned:true});
assert.equal(state(older,shared.topicId).planTone,"full");
assert.equal(state(topicIdea,us.topicId).planTone,"none");
assert.notDeepEqual(sourceChoiceForRow(us.topicId,g9.id),
 sourceChoiceForRow(shared.topicId,g1012.id));

// A topic inherited from a whole-course idea can be explicitly deselected.
const withException=structuredClone(allIdea);
withException.topics.find(t=>t.topicId===ancient.topicId).ideaChoice="off";
assert.equal(state(withException,ancient.topicId).ideaTone,"none");
assert.equal(state(withException,us.topicId).ideaTone,"inherited");
assert.equal(pendingIdeaCount(withException,people),allIdea.topics.length-1);

// An excluded topic is not available in either column.
const excluded=structuredClone(allIdea);
excluded.topics.find(t=>t.topicId===us.topicId).included=false;
assert.equal(state(excluded,us.topicId).excluded,true);
assert.equal(state(excluded,us.topicId).ideaTone,"none");
assert.equal(state(excluded,us.topicId).planTone,"none");

// Explicit Return to Think Tank may retain historical student checkboxes.
// The stored stage, not the mere existence of an inactive student link,
// decides whether the selected topic is presented in Think Tank.
const parked=structuredClone(allPlan);
parked.stage="idea";
parked.ideaAll=true;
assert.equal(state(parked).planTone,"none");
assert.equal(state(parked).ideaTone,"full");
assert.equal(state(parked,us.topicId).ideaTone,"inherited");
assert.equal(pendingIdeaCount(parked,people),parked.topics.length);

// A single-topic course still has saturated course-level controls.
const single=catalog.courses.find(c=>c.type==="Single-Topic Course");
assert.ok(single);
const one={courseId:single.id,stage:"planned",ideaAll:false,studentIds:["AJ"],
 overrides:[],topics:[{topicId:single.id,included:true,ideaChoice:"inherit"}]};
assert.equal(listRowStatus(one,people,null,false,true).planTone,"full");

// Toolbar tints use the same existing row status as the saved assignment
// indicators. One chosen topic colors that topic + its parent, never siblings.
const hasTint=(course,topicId=null)=>{
 const row=listRowStatus(course,people,topicId,true,false);
 return row.ideaActive || row.planActive;
};
assert.equal(hasTint(grade9),false,"untouched parent stays neutral");
assert.equal(hasTint(allIdea),true,"whole-course idea colors its toolbar");
for(const topic of allIdea.topics)
 assert.equal(hasTint(allIdea,topic.topicId),true,
   "all child toolbars tint when the whole course is considered");
assert.equal(hasTint(withException,ancient.topicId),false,
 "deselected child remains neutral despite an active parent idea");
assert.equal(hasTint(withException,us.topicId),true);
assert.equal(hasTint(topicPlan),true,"a topic-only plan tints the parent controls");
assert.equal(hasTint(topicPlan,us.topicId),true);
for(const topic of topicPlan.topics.filter(t=>t.topicId!==us.topicId))
 assert.equal(hasTint(topicPlan,topic.topicId),false,
   "topic-only plan must not tint untouched sibling controls");
assert.equal(hasTint(allPlan),true);
for(const topic of allPlan.topics)
 assert.equal(hasTint(allPlan,topic.topicId),true,
   "whole-course plan tints each included topic's toolbar");
assert.equal(hasTint(mixed,ancient.topicId),true,"Think Tank idea coexists with planned topic");
assert.equal(hasTint(mixed,us.topicId),true,"planned topic coexists with Think Tank idea");

const explorer=readFileSync(new URL("../app/courses/CourseExplorer.tsx",import.meta.url),"utf8");
const listCss=readFileSync(new URL("../app/courses/course-explorer.css",import.meta.url),"utf8");
assert.match(explorer,/const hasPlanningSelection = mode === "plan" && \(status.ideaActive \|\| status.planActive\)/);
assert.match(explorer,/hasPlanningSelection \? " cx-has-planning-selection" : ""/);
assert.match(listCss,/\.cx-course\.cx-has-planning-selection > \.cx-course-head\s+\.cx-course-actions button\.planning-icon-control:not\(\.cx-info-action\)/);
assert.match(listCss,/\.cx-course\.cx-has-planning-selection > \.cx-course-head \.cx-course-actions\s+\.priority-control:not\(\.shared-arrangement-control\):not\(\.has-priority\)/);
assert.match(listCss,/button\.planning-icon-control\.cx-info-action:not\(\.is-open\)/);
assert.match(listCss,/\.cx-course\.cx-has-planning-selection > \.cx-course-head \.cx-course-actions\s+button\.planning-icon-control\.cx-info-action\.is-open/);
// Row tint/rail rules remain separate from this toolbar-only addition.
assert.match(listCss,/\.cx-course\.cx-status-full \{\s*box-shadow:inset 3px 0 0 var\(--cx-subject\);/);

for(const [subject,expected] of Object.entries({
 History:"#6b6bbf",Literature:"#c07669",Math:"#6d7eaa",
 English:"#9b5b7b",Science:"#96a767",Citizenship:"#62765c",
 "Modern Language":"#6db4b2","Life Skills":"#d1b358",
})){
 assert.equal(subjectColor(subject),expected,subject+" legacy palette");
 assert.equal(subjectColors[subject],expected);
}
assert.equal(subjectColor("LITERATURE"),subjectColors.Literature);
console.log("PASS: course-origin selections are saturated at parent with light children; topic-origin selections are saturated only at child with light parent and neutral siblings.");
