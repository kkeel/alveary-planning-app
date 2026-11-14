"use client";

import { useState } from "react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import catalog from "../courses/catalog-preview.json";

const titles = new Map(catalog.courses.map(c => [c.id, c.title]));
const types = new Map(catalog.courses.map(c => [c.id, c.type]));

function CourseAssignments({ course }: { course: SavedCourse }) {
  const demo = useDemoPlan();
  const desk = usePlanningDesk();
  const [showTopics, setShowTopics] = useState(false);
  const included = course.topics.filter(t => t.included);
  const total = course.topics.length;
  const combined = types.get(course.courseId) === "Combined Course";

  const effective = (topicId: string, studentId: string) => {
    const specific = course.overrides.find(o => o.topicId === topicId && o.studentId === studentId);
    return specific ? specific.assigned : course.studentIds.includes(studentId);
  };

  return <section className="myplan-course">
    <div className="myplan-course-heading">
      <div>
        <h3>{titles.get(course.courseId) ?? "Saved course"}</h3>
        <p>{combined ? "Combined course · " : ""}{included.length} of {total} topics included</p>
      </div>
      <button type="button" onClick={() => demo.setStage(course.courseId, "idea")} disabled={demo.saving}
        className="myplan-subtle">Return to Think Tank</button>
    </div>

    <div className="myplan-group">
      <strong>{combined ? "Assign the complete included course" : "Assign this course"}</strong>
      <p>One click assigns {combined ? "every included topic" : "this topic"} to a student. Each topic remains individually schedulable and printable.</p>
      {demo.students.length ? <div className="myplan-student-choices">
        {demo.students.map(student => {
          const groupChecked = course.studentIds.includes(student.id);
          const hasExceptions = included.some(topic => course.overrides.some(o =>
            o.topicId === topic.topicId && o.studentId === student.id));
          return <div className="myplan-student-choice" key={student.id}>
            <label>
              <input type="checkbox" checked={groupChecked}
                onChange={e => demo.assignCourse(course.courseId, student.id, e.target.checked)}/>
              <span>{student.displayName}</span>
            </label>
            {groupChecked && hasExceptions && <button type="button" onClick={() =>
              demo.assignCourse(course.courseId, student.id, true)} className="myplan-subtle">
              Reapply all
            </button>}
          </div>;
        })}
      </div> : <p>No students yet. <Link href="/students">Add a student</Link> to assign courses.</p>}
    </div>

    <button type="button" className="myplan-topic-toggle"
      aria-expanded={showTopics} onClick={() => setShowTopics(x => !x)}>
      {showTopics ? "Hide individual topics" : "Adjust individual topics"} ({total})
    </button>
    {showTopics && <div className="myplan-topics">
      {course.topics.map(topic => {
        const title = titles.get(topic.topicId) ?? "Topic";
        return <div className={"myplan-topic" + (!topic.included ? " is-excluded" : "")} key={topic.topicEditionId}>
          <div className="myplan-topic-title">
            <strong>{title}</strong>
            <label className="myplan-include">
              <input type="checkbox" checked={topic.included} onChange={e =>
                desk.toggleCourseTopic(course.courseId, topic.topicId, course.topics.map(t => t.topicId))}/>
              Include
            </label>
          </div>
          {topic.included ? demo.students.length ? <div className="myplan-topic-students">
            {demo.students.map(student => <label key={student.id}>
              <input type="checkbox" checked={effective(topic.topicId, student.id)}
                onChange={e => demo.assignTopic(course.courseId, topic.topicId, student.id, e.target.checked)}/>
              {student.displayName}
            </label>)}
          </div> : null : <p>Excluded from this course's active topic plan. Its identity and preferences are kept if restored.</p>}
        </div>;
      })}
    </div>}
  </section>;
}

export default function MyPlanPanel() {
  const demo = useDemoPlan();
  const desk = usePlanningDesk();
  const planned = demo.courses.filter(c => c.stage === "planned");
  const ideas = demo.courses.filter(c => c.stage === "idea");

  if (!demo.ready) return <div className="myplan-panel">
    <h3>My Plan</h3>
    <p>{demo.error ?? "Opening your saved family plan…"}</p>
    <p>Your existing browser Think Tank remains available.</p>
  </div>;

  return <section className="myplan-panel">
    <header>
      <h3>My Plan</h3>
      <p>Choose courses together, then assign each included topic to the students who will study it.</p>
    </header>
    {demo.saving && <p className="myplan-save-status" role="status">Saving your changes…</p>}
    {demo.error && <p className="myplan-save-error" role="alert">{demo.error}</p>}
    {planned.length ? planned.map(course =>
      <CourseAssignments key={course.courseId} course={course}/>) :
      <div className="myplan-empty">
        <p>No courses have been moved into My Plan yet. Your Think Tank ideas can stay unassigned as long as you like.</p>
        <button type="button" onClick={() => desk.setTab("think")}>Review Think Tank ideas</button>
      </div>}
    {ideas.length > 0 && <div className="myplan-idea-section">
      <h4>Still considering</h4>
      {ideas.map(course => <div key={course.courseId} className="myplan-idea-row">
        <span>{titles.get(course.courseId) ?? course.courseId}</span>
        <button type="button" onClick={() => demo.setStage(course.courseId, "planned")}>
          Add to My Plan
        </button>
      </div>)}
    </div>}
  </section>;
}
