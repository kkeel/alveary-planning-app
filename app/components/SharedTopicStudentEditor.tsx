"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import { useDemoPlan } from "./DemoPlanContext";
import { isTopicAssigned } from "./topic-assignment.mjs";
import catalog from "../courses/catalog-preview.json";

const names = new Map(catalog.courses.map(course => [course.id, course.title]));

/**
 * Edit an edition through its SAVED PARENT course choice. An edition may
 * appear under multiple parents; editing one source must not alter another.
 * When planning from Think Tank, show only the clicked parent, even before
 * that parent has any effectively assigned students.
 */
export default function SharedTopicStudentEditor({
  topicEditionId, currentCourseId, currentCourseOnly = false, onAssigned,
}: {
  topicEditionId: string;
  currentCourseId: string;
  currentCourseOnly?: boolean;
  onAssigned?: () => void;
}) {
  const demo = useDemoPlan();
  const inputId = useId();
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const groups = useMemo(() => demo.courses.filter(course =>
    (currentCourseOnly
      ? course.courseId === currentCourseId
      : course.stage === "planned") &&
    course.topics.some(topic => topic.topicEditionId === topicEditionId && topic.included)
  ).sort((a,b) => (a.courseId === currentCourseId ? -1 : b.courseId === currentCourseId ? 1 : 0)),
  [demo.courses, topicEditionId, currentCourseId, currentCourseOnly]);

  async function addStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (studentSaving || !studentName.trim()) return;
    setStudentSaving(true);
    setStudentError(null);
    const ok = await demo.addStudent(studentName, studentGrade === "" ? null : Number(studentGrade));
    setStudentSaving(false);
    if (ok) {
      setAddingStudent(false);
      setStudentName("");
      setStudentGrade("");
    } else {
      setStudentError("The student couldn't be added. Existing assignments are unchanged.");
    }
  }

  if (!groups.length) return <p className="plan-microcopy">
    {currentCourseOnly ? "Save this parent course to your Demo Think Tank before assigning a topic." :
      "No included planned course uses this topic yet."}
  </p>;

  return <div className="pd-topic-shared-editor">
    <p className="plan-microcopy">
      {currentCourseOnly
        ? <>Assign this topic through <strong>{names.get(currentCourseId) ?? "the selected course"}</strong>.
          No other topics will be added for these students.</>
        : "Edit every student using this topic. The course beneath each checkbox shows where that assignment comes from."}
    </p>
    {demo.students.map(student => <div className="pd-topic-student-sources" key={student.id}>
      <strong>{student.displayName}</strong>
      <div className="pd-topic-source-choices">
        {groups.map(group => {
          const topic = group.topics.find(item => item.topicEditionId === topicEditionId)!;
          const checked = isTopicAssigned(group, topic.topicId, student.id);
          return <label key={group.courseId} className={checked ? "is-assigned" : ""}>
            <input type="checkbox" checked={checked}
              onChange={event => {
                demo.assignTopic(group.courseId, topic.topicId, student.id, event.target.checked);
                if (event.target.checked) onAssigned?.();
              }}/>
            <span>{currentCourseOnly ? "This topic only" :
              names.get(group.courseId) ?? "Course grouping"}</span>
          </label>;
        })}
      </div>
    </div>)}
    {currentCourseOnly && <>
      <button className="pd-inline-edit" type="button"
        aria-expanded={addingStudent}
        onClick={() => { setAddingStudent(v => !v); setStudentError(null); }}>
        {addingStudent ? "Cancel adding" : "+ Add student"}
      </button>
      {addingStudent && <form className="pd-student-inline-form"
        onSubmit={event => void addStudent(event)}>
        <label htmlFor={inputId+"-name"}>Name or nickname</label>
        <input id={inputId+"-name"} value={studentName} required maxLength={60}
          onChange={event => setStudentName(event.target.value)}/>
        <label htmlFor={inputId+"-grade"}>Grade for 2027–28</label>
        <select id={inputId+"-grade"} value={studentGrade}
          onChange={event => setStudentGrade(event.target.value)}>
          <option value="">Decide later</option>
          <option value="0">Kindergarten</option>
          {Array.from({length:12},(_,index) => index+1).map(grade =>
            <option value={grade} key={grade}>Grade {grade}</option>)}
        </select>
        <button type="submit" disabled={!studentName.trim() || studentSaving}>
          {studentSaving ? "Adding…" : "Save student"}
        </button>
        {studentError && <span role="alert" className="pd-inline-student-error">
          {studentError}
        </span>}
      </form>}
    </>}
    {!demo.students.length && <p className="plan-microcopy">
      {currentCourseOnly ? "Add a student above, then choose this topic." :
        "Add a student to begin assigning this topic."}
    </p>}
  </div>;
}
