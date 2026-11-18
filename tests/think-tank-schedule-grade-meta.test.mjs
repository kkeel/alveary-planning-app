import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const desk = read("app/components/PlanningDesk.tsx");
const topics = read("app/components/CourseTopicReview.tsx");
const meta = read("app/components/PlanningScheduleGradeMeta.tsx");
const css = read("app/components/planning-desk.css");
const catalog = JSON.parse(read("app/courses/catalog-preview.json"));

// Expanded shows topic rows but no scheduling/grade clutter in course titles.
// Detailed displays published course metadata exactly once, inside guidance.
const courseMeta = desk.indexOf('<PlanningScheduleGradeMeta course={idea} detailed/>');
const courseDetails = desk.indexOf('className="pd-course-inline-details"');
assert.ok(courseMeta > courseDetails);
assert.ok(!desk.includes('{reviewOpen && <PlanningScheduleGradeMeta course={idea}/>}'));
assert.ok(desk.includes('desk.thinkDetails === "topics" && hasTopics'));
// Every nested topic owns its own recommendation in either planning column, visible only in details;
// it is not copied onto its combined-course parent or the collapsed topic row.
const topicInfo = topics.indexOf('{infoOpen && <div className="pd-topic-info"');
const topicMeta = topics.indexOf('<PlanningScheduleGradeMeta course={topic} detailed/>');
assert.ok(topicInfo >= 0 && topicMeta > topicInfo,
  "Topic schedule must appear in the opened topic detail disclosure");
assert.match(topics,
  /topic\.schedules\.length \|\| topic\.gradeDisplay \|\| topic\.grades\.length/,
  "A topic with scheduling or grade metadata should be expandable even without prose");

assert.ok(meta.includes("schedule.text") && meta.includes("course.gradeDisplay"),
  "Use the Course List's existing published fields without generating a personal schedule");
assert.ok(meta.includes("schedules.map("),
  "Multiple exact published recommendations must remain visible in Detailed mode");
assert.ok(css.includes(".pd-schedule-grade-meta") && css.includes(".pd-schedule-grade-range.has-schedule"),
  "Metadata should remain styled as secondary information");

// Representative catalog editions protect combined-course topic ownership.
const combined = catalog.courses.find(c => c.title === "Language Study: Grade 7");
const topic = catalog.courses.find(c => c.title === "Copywork: Grade 7");
const single = catalog.courses.find(c => c.title === "Art: Level 1");
assert.equal(combined?.type, "Combined Course");
assert.equal(combined?.schedules.length, 0);
assert.ok(combined.gradeDisplay);
assert.equal(topic?.type, "Topic");
assert.ok(topic.schedules.length > 0 && topic.gradeDisplay);
assert.equal(single?.type, "Single-Topic Course");
assert.ok(single.schedules.length > 0 && single.gradeDisplay);

console.log("Think Tank condensed schedule and complete detailed metadata: OK");
