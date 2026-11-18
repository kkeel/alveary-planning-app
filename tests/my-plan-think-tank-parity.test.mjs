import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const desk = read("app/components/PlanningDesk.tsx");
const plan = read("app/components/MyPlanPanel.tsx");
const topics = read("app/components/CourseTopicReview.tsx");
const editor = read("app/components/StudentAssignmentEditor.tsx");
const studentPriority = read("app/components/StudentPriorityControl.tsx");
const arrangement = read("app/components/StudentArrangementControl.tsx");
const css = read("app/components/planning-desk.css");

// Planning has manual single-open disclosures; Course List can keep its own
// separate list/compact controls.
assert.ok(!desk.includes("<DetailViewSwitch"), "Think Tank full-page toggle removed");
assert.ok(!plan.includes("DetailViewSwitch"), "My Plan full-page toggle removed");
assert.ok(!desk.includes('<div className="pd-full-status">'),
  "Remove redundant notebook / Your Planning Desk row beneath List | Planning");

// Same subject palettes, course rows, info disclosure, neutral review,
// topic list and left colored rail. No nested My Plan cards or green panels.
assert.ok(plan.includes('"--pd-subject-color": subjectColor(subject)'));
assert.ok(plan.includes('"--pd-subject-edge": subjectColor(subject) + "66"'));
for (const marker of [
  'className="pd-subject-items pd-think-course-list"',
  'className={"pd-idea myplan-row" + (open ? " is-open" : "")}',
  'className="pd-idea-review"',
  'className="pd-row-tool pd-mini-info-action"',
  'className="pd-review pd-think-review myplan-review"',
  '<CourseInfoDisclosure course={item}/>',
  'className="pd-think-description-section"',
  'mode="plan"',
]) assert.ok(plan.includes(marker), "Missing My Plan / Think Tank parity: "+marker);
assert.ok(css.includes(".pd-think-course-list > .pd-idea + .pd-idea"),
  "Both columns should share simple course list dividers");
assert.ok(css.includes(".pd-think-course-list > .pd-idea > .pd-review.pd-think-review"),
  "Only expanded details carry the subject left rail");
assert.ok(css.includes("border-left:4px solid var(--pd-subject-edge,#a8b9a9);"));
assert.ok(css.includes(".pd-review.pd-think-review {"),
  "Shared review style must override the old tinted My Plan background");
assert.ok(css.includes("background:transparent;"),
  "Expanded details no longer need a filled review panel");

// Only one open My Plan course across ALL subjects; the clickable title
// and the small i button toggle the same accordion.
assert.ok(plan.includes('const [openId, setOpenId] = useState<string | null>(null)'));
assert.ok(plan.includes('const open = openId === course.courseId;'));
assert.ok(!plan.includes("openOverrides"), "Remove per-row multi-open preferences");
assert.ok(plan.includes("toggleDetails(course.courseId,event.currentTarget)"));
assert.ok(plan.includes("rememberAnchor") && plan.includes("useLayoutEffect"));
assert.ok(plan.includes("focusCourseId, focusRevision"),
  "Transfer from Think Tank to My Plan still focuses the assigned course");

// My Plan adds student data, retains checkmarks, and provides normal course
// grade/scheduling information, plus student names per planned topic.
assert.ok(plan.includes("<SquareCheckBig") && topics.includes("<SquareCheckBig"));
assert.ok(plan.includes("studentSummary(course,demo.students,demo.assignmentArrangements,demo.sharedArrangements)"));
assert.ok(plan.includes("{open && item && <PlanningScheduleGradeMeta course={item}/>}")
);
assert.ok(topics.includes("const assignedNames = mode === \"plan\" && savedChoice && !isRemoved"));
assert.ok(topics.includes('assignedNames.map((name,index)=>')); 
assert.ok(topics.includes('StudentPriorityDot'));
assert.ok(!plan.includes('Customized priorities'), "Course metadata leaves priority differences to the icon");
assert.ok(topics.includes("<PlanningScheduleGradeMeta course={topic}/>"),
  "My Plan topic details should show same schedule/grade metadata as Think Tank");

// Course + / +All becomes Edit Students in the toolbar; use exactly the same
// persisted student checkboxes, groups, priorities and Done flow.
assert.ok(plan.includes('<UsersRound size={17} aria-hidden="true"/>'));
assert.ok(plan.includes('Edit students'));
assert.ok(plan.includes('className="floating-icon-menu"'));
assert.ok(plan.includes("<FloatingChoiceMenu open={menuOpen}"));
assert.ok(plan.includes("toggleStudentEdit(course.courseId,event.currentTarget)"));
assert.ok(plan.includes("<StudentAssignmentEditor course={course}"));
assert.ok(topics.includes("Edit students"), "Student editor stays reachable through topic More menu");
assert.ok(topics.includes("<SharedTopicStudentEditor"));
assert.ok(editor.includes('<input type="checkbox" checked={isAssigned}'));
assert.ok(arrangement.includes("plan.setAssignmentArrangement"));
assert.ok(studentPriority.includes("plan.setAssignmentPriority"));
assert.ok(editor.includes("<StudentPriorityControl"));
assert.ok(plan.includes('className="pd-row-tool pd-mini-info-action"'),
  "Keep the small i button as an explicit information affordance");
assert.ok(plan.includes('href={"/books?course="+encodeURIComponent(course.courseId)}'));
assert.ok(topics.includes('href={"/books?course="+encodeURIComponent(topic.id)}'));

// More ... hosts Books, Edit Students, and Return to Think Tank.
// It must not appear as an extra footer in expanded details.
assert.ok(plan.includes('className="pd-more"'));
assert.ok(plan.includes('<MoreHorizontal size={16}'));
assert.ok(plan.includes('className="floating-icon-menu"'));
assert.ok(plan.includes("demo.setStage(course.courseId,\"idea\")"));
assert.ok(plan.includes("Return to Think Tank"));
assert.ok(!plan.includes('pd-myplan-toolbar-edit'));
assert.ok(topics.includes('className="pd-topic-icon pd-topic-info-action"'));
assert.ok(!topics.includes('className="pd-topic-icon pd-topic-edit"'));
assert.ok(!plan.includes('className="pd-review-actions"'));

// Hover/focus selectors must apply to both Think Tank and My Plan. No whole
// topic-row hover, while title, more, and individual topic controls work.
assert.ok(css.includes(".pd-idea .pd-idea-review:hover,"));
assert.ok(css.includes(".pd-idea .pd-mini-info-action:hover,"));
assert.ok(css.includes(".pd-idea .pd-more:hover,"));
assert.ok(css.includes(".pd-think-review .pd-topic-row .pd-topic-title-button:hover,"));
assert.ok(!css.includes(".pd-think-review .pd-topic-row:hover"));
console.log("My Plan / Think Tank parity: single-open, student edits, metadata, menus, hover, neutral details: OK");
