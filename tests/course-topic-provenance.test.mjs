import assert from "node:assert/strict";
import { coursePriority, topicPriorityOverride, effectivePriority } from "../app/components/priority-inheritance.mjs";
import { courseArrangement, topicArrangementOverride, effectiveArrangement } from "../app/components/arrangement-inheritance.mjs";
import { savedTopicContexts } from "../app/components/shared-topic-contexts.mjs";

import { readFileSync } from "node:fs";
import { isTopicAssigned, effectiveTopicCount, remainingTopicCount, shouldPromoteChoiceOnDone } from "../app/components/topic-assignment.mjs";

const catalog = JSON.parse(readFileSync(
  new URL("../app/courses/catalog-preview.json", import.meta.url), "utf8"
));
const byEdition = new Map(catalog.courses.map(course => [course.editionId, course]));
const byTitle = new Map(catalog.courses.map(course => [course.title, course]));
const g9 = byTitle.get("History: Grade 9 (U.S.)");
const g1012 = byTitle.get("History: Grades 10-12 (U.S.)");
assert.ok(g9 && g1012, "both distinct combined parent courses must be in this release");

function makeChoice(parent) {
  return {
    courseId: parent.id, stage: "idea", studentIds: [], overrides: [],
    topics: catalog.topicLinks.filter(link => link.parentEditionId === parent.editionId)
      .map(link => {
        const row = byEdition.get(link.childEditionId);
        return { topicId: row.id, topicEditionId: row.editionId, included: true };
      }),
  };
}

const ajParent = makeChoice(g9);
const troyParent = makeChoice(g1012);
assert.equal(ajParent.topics.length, 3);
assert.equal(troyParent.topics.length, 3);
assert.notEqual(ajParent.courseId, troyParent.courseId);
const us9 = ajParent.topics.find(topic =>
  byEdition.get(topic.topicEditionId)?.title === "U.S. History: Grades 9-12");
const us1012 = troyParent.topics.find(topic => topic.topicEditionId === us9?.topicEditionId);
assert.ok(us9 && us1012, "both History parents must reference the SAME exact topic edition");
const ancient9 = ajParent.topics.find(topic => byEdition.get(topic.topicEditionId)?.title.startsWith("Ancient History"));
const world9 = ajParent.topics.find(topic => byEdition.get(topic.topicEditionId)?.title.startsWith("World History"));
assert.ok(ancient9 && world9);

// A topic-first assignment uses the parent course's topic exception, NOT a
// standalone topic choice and NOT a parent-wide course-student relationship.
// Reproduce a real saved state: after returning a once-planned course to the
// Think Tank, its student/topic overrides remain selected but its stage is idea.
ajParent.overrides.push({ topicId:us9.topicId, studentId:"AJ", assigned:true });
assert.equal(ajParent.stage,"idea");
assert.equal(shouldPromoteChoiceOnDone(ajParent,us9.topicId,[{id:"AJ"}]),true,
  "Done must promote an already-checked topic from Think Tank to My Plan");
assert.equal(shouldPromoteChoiceOnDone(ajParent,ancient9.topicId,[{id:"AJ"}]),false,
  "Done must not promote a topic with no selected student");
assert.equal(shouldPromoteChoiceOnDone(ajParent,undefined,[{id:"AJ"}]),false,
  "+ All does not mistake topic-only assignments for a whole-course choice");
ajParent.stage = "planned";
assert.equal(shouldPromoteChoiceOnDone(ajParent,us9.topicId,[{id:"AJ"}]),false,
  "Done must not resave an already-planned course");

assert.deepEqual(ajParent.studentIds, []);
assert.equal(isTopicAssigned(ajParent,us9.topicId,"AJ"),true);
assert.equal(isTopicAssigned(ajParent,ancient9.topicId,"AJ"),false);
assert.equal(isTopicAssigned(ajParent,world9.topicId,"AJ"),false);
assert.equal(effectiveTopicCount(ajParent,"AJ"),1);
assert.equal(effectiveTopicCount(ajParent,"Troy"),0);
assert.equal(remainingTopicCount(ajParent,[{id:"AJ"},{id:"Troy"}]),2,
  "the two unassigned History topics must remain in Think Tank");

// Same edition, separate parent provenance for a different student.
troyParent.stage = "planned";
troyParent.overrides.push({ topicId:us1012.topicId, studentId:"Troy", assigned:true });
assert.equal(effectiveTopicCount(troyParent,"Troy"),1);
assert.equal(remainingTopicCount(troyParent,[{id:"AJ"},{id:"Troy"}]),2,
  "the shared edition may be planned separately through a second parent");
assert.equal(effectiveTopicCount(ajParent,"Troy"),0);
assert.equal(effectiveTopicCount(troyParent,"AJ"),0);

// When the same exact topic edition is planned under multiple saved parent
// courses, the editor can select and update either course context explicitly.
// A checkbox in one context never overwrites the other context.
const contexts = savedTopicContexts([ajParent,troyParent], us9.topicEditionId);
assert.equal(contexts.length,2);
assert.deepEqual(new Set(contexts.map(c=>c.courseId)),
  new Set([g9.id,g1012.id]));
assert.equal(contexts.find(c=>c.courseId === g9.id).topicId,us9.topicId);
assert.equal(contexts.find(c=>c.courseId === g1012.id).topicId,us1012.topicId);
assert.equal(isTopicAssigned(ajParent,us9.topicId,"AJ"),true);
assert.equal(isTopicAssigned(troyParent,us1012.topicId,"AJ"),false,
  "AJ in Grade 9 must not be marked as assigned through the Troy parent");
troyParent.overrides.push({
  topicId:us1012.topicId,studentId:"Hannah",assigned:true
});
assert.equal(isTopicAssigned(troyParent,us1012.topicId,"Hannah"),true);
assert.equal(isTopicAssigned(ajParent,us9.topicId,"Hannah"),false,
  "a new student in the alternate context leaves Grade 9 unchanged");
troyParent.overrides=troyParent.overrides.filter(o=>o.studentId!=="Hannah");
assert.equal(isTopicAssigned(troyParent,us1012.topicId,"Troy"),true,
  "removing a student from the alternate parent leaves other students assigned");
const excludedOther = structuredClone(troyParent);
excludedOther.topics.find(t=>t.topicId===us1012.topicId).included=false;
assert.deepEqual(savedTopicContexts([ajParent,excludedOther],us9.topicEditionId)
  .map(c=>c.courseId),[g9.id],
  "excluded topics cannot be edited as saved shared contexts");
const differentEdition = savedTopicContexts([ajParent,troyParent],ancient9.topicEditionId);
assert.deepEqual(differentEdition.map(c=>c.courseId),[g9.id],
  "matching parent-course family names do not imply the same exact edition");

// Each student has an independent course default, with optional topic
// overrides within the SAME parent. Sharing the U.S. History edition across
// different History parents must not leak priorities.
const priorities = [
  {courseId:g9.id,studentId:"AJ",topicId:null,priority:"Core"},
  {courseId:g9.id,studentId:"AJ",topicId:ancient9.topicId,priority:"Additional"},
  {courseId:g9.id,studentId:"AJ",topicId:world9.topicId,priority:"Not set"},
  {courseId:g1012.id,studentId:"Troy",topicId:null,priority:"High Interest"},
];
assert.equal(coursePriority(priorities,g9.id,"AJ"),"Core");
assert.equal(effectivePriority(priorities,g9.id,"AJ",us9.topicId),"Core",
  "a topic without an override inherits the student's course priority");
assert.equal(effectivePriority(priorities,g9.id,"AJ",ancient9.topicId),"Additional");
assert.equal(effectivePriority(priorities,g9.id,"AJ",world9.topicId),null,
  "Not set overrides Core rather than inheriting it");
assert.equal(topicPriorityOverride(priorities,g9.id,"AJ",us9.topicId),"inherit");
assert.equal(effectivePriority(priorities,g9.id,"Troy",ancient9.topicId),null,
  "other students must not inherit AJ's priorities");
assert.equal(effectivePriority(priorities,g1012.id,"Troy",us1012.topicId),"High Interest",
  "another parent with the same edition retains its own priority");
const withoutAncientOverride = priorities.filter(p =>
  !(p.courseId===g9.id && p.studentId==="AJ" && p.topicId===ancient9.topicId));
assert.equal(effectivePriority(withoutAncientOverride,g9.id,"AJ",ancient9.topicId),"Core",
  "Use course default removes the override and restores inheritance");
// Priority rows remain independent of the membership changes tested below.
// Arrangement inheritance follows the same independent parent/student/topic
// scope as priorities; topic Later explicitly overrides a Combined course.
const placements = [
  {courseId:g9.id,studentId:"AJ",topicId:null,arrangement:"Combined"},
  {courseId:g9.id,studentId:"AJ",topicId:ancient9.topicId,arrangement:"Separate"},
  {courseId:g9.id,studentId:"AJ",topicId:world9.topicId,arrangement:"Later"},
  {courseId:g1012.id,studentId:"Troy",topicId:null,arrangement:"Separate"},
];
assert.equal(courseArrangement(placements,g9.id,"AJ"),"Combined");
assert.equal(effectiveArrangement(placements,g9.id,"AJ",us9.topicId),"Combined");
assert.equal(effectiveArrangement(placements,g9.id,"AJ",ancient9.topicId),"Separate");
assert.equal(effectiveArrangement(placements,g9.id,"AJ",world9.topicId),"Later");
assert.equal(topicArrangementOverride(placements,g9.id,"AJ",us9.topicId),"inherit");
assert.equal(effectiveArrangement(placements,g1012.id,"Troy",us1012.topicId),"Separate");
assert.equal(effectiveArrangement(placements,g9.id,"Troy",us9.topicId),"Later");
const inheritedAncient = placements.filter(p =>
  !(p.courseId === g9.id && p.studentId === "AJ" &&
    p.topicId === ancient9.topicId));
assert.equal(effectiveArrangement(inheritedAncient,g9.id,"AJ",ancient9.topicId),"Combined",
  "removing a topic override restores the course arrangement");
const changedCourseDefault = placements.map(p =>
  p.courseId === g9.id && p.studentId === "AJ" && p.topicId === null
    ? {...p,arrangement:"Separate"} : p);
assert.equal(effectiveArrangement(changedCourseDefault,g9.id,"AJ",us9.topicId),"Separate");
assert.equal(effectiveArrangement(changedCourseDefault,g9.id,"AJ",ancient9.topicId),"Separate");
assert.equal(effectiveArrangement(changedCourseDefault,g9.id,"AJ",world9.topicId),"Later");

// Reapply whole Grade-9 History for AJ: one parent group link covers every
// included topic, and the previous topic-only override is discarded.
ajParent.stage = "idea";
ajParent.studentIds.push("AJ");
ajParent.overrides = [];
assert.equal(shouldPromoteChoiceOnDone(ajParent,undefined,[{id:"AJ"}]),true,
  "Done on + All also handles an already-selected course assignment");
ajParent.stage = "planned";
assert.equal(effectiveTopicCount(ajParent,"AJ"),3);
assert.equal(remainingTopicCount(ajParent,[{id:"AJ"},{id:"Troy"}]),0,
  "a fully assigned course should no longer be duplicated in Think Tank");
assert.equal(effectiveTopicCount(troyParent,"Troy"),1);
ajParent.overrides.push({ topicId: ancient9.topicId, studentId:"AJ", assigned:false });
assert.equal(effectiveTopicCount(ajParent,"AJ"),2);
// Excluded topic never counts even if a stale positive exception exists.
ajParent.topics.find(topic => topic.topicId === ancient9.topicId).included = false;
ajParent.overrides.push({ topicId: ancient9.topicId, studentId:"Hannah", assigned:true });
assert.equal(isTopicAssigned(ajParent,ancient9.topicId,"Hannah"),false);
assert.equal(effectiveTopicCount(ajParent,"Hannah"),0);
assert.equal(effectiveTopicCount(ajParent,"AJ"),2);

console.log("PASS: topic-first assignment stays inside its combined parent; shared editions retain separate student/course provenance; whole-course and exclusion rules hold.");
