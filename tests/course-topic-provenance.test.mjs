import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isTopicAssigned, effectiveTopicCount } from "../app/components/topic-assignment.mjs";

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
ajParent.stage = "planned";
ajParent.overrides.push({ topicId:us9.topicId, studentId:"AJ", assigned:true });
assert.deepEqual(ajParent.studentIds, []);
assert.equal(isTopicAssigned(ajParent,us9.topicId,"AJ"),true);
assert.equal(isTopicAssigned(ajParent,ancient9.topicId,"AJ"),false);
assert.equal(isTopicAssigned(ajParent,world9.topicId,"AJ"),false);
assert.equal(effectiveTopicCount(ajParent,"AJ"),1);
assert.equal(effectiveTopicCount(ajParent,"Troy"),0);

// Same edition, separate parent provenance for a different student.
troyParent.stage = "planned";
troyParent.overrides.push({ topicId:us1012.topicId, studentId:"Troy", assigned:true });
assert.equal(effectiveTopicCount(troyParent,"Troy"),1);
assert.equal(effectiveTopicCount(ajParent,"Troy"),0);
assert.equal(effectiveTopicCount(troyParent,"AJ"),0);

// Reapply whole Grade-9 History for AJ: one parent group link covers every
// included topic, and the previous topic-only override is discarded.
ajParent.studentIds.push("AJ");
ajParent.overrides = [];
assert.equal(effectiveTopicCount(ajParent,"AJ"),3);
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
