"use client";

import { useId, useMemo, useState } from "react";
import { useDemoPlan } from "./DemoPlanContext";
import { isTopicAssigned } from "./topic-assignment.mjs";
import { savedTopicContexts } from "./shared-topic-contexts.mjs";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import catalog from "../courses/catalog-preview.json";

const names = new Map(catalog.courses.map(item => [item.id, item.title]));

/**
 * A topic edition can belong to more than one saved parent course. Let a
 * member switch that source explicitly without leaving the student editor.
 * Every checkbox, priority and arrangement still uses exactly the chosen
 * parent course and its child topic; no cross-parent writes or bulk syncing.
 */
export default function SharedTopicStudentEditor({
  topicEditionId, currentCourseId, onAssigned, onClose, onCancel,
}: {
  topicEditionId: string;
  currentCourseId: string;
  onAssigned?: (courseId: string) => void;
  onClose?: (courseId: string) => void;
  onCancel?: () => void;
}) {
  const demo = useDemoPlan();
  const selectId = useId();
  const [activeCourseId, setActiveCourseId] = useState(currentCourseId);
  const contexts = useMemo(() =>
    savedTopicContexts(demo.courses, topicEditionId).sort((a,b) =>
      Number(b.courseId === currentCourseId) -
      Number(a.courseId === currentCourseId)),
    [demo.courses, topicEditionId, currentCourseId]);

  const active = contexts.find(context => context.courseId === activeCourseId) ??
    contexts.find(context => context.courseId === currentCourseId);
  const selectedCourse = active &&
    demo.courses.find(course => course.courseId === active.courseId);

  if (!active || !selectedCourse) return <p className="plan-microcopy" role="status">
    This topic is not currently included in a saved course. Restore or save
    its course before editing the student assignment.
  </p>;

  return <div className="pd-topic-context-editor">
    {contexts.length > 1 && <div className="pd-topic-context-switch">
      <label htmlFor={selectId}>↔ Shared course options</label>
      <p id={selectId+"-help"}>Choose a course to edit</p>
      <select id={selectId} aria-describedby={selectId+"-help"} value={active.courseId}
        onChange={event => setActiveCourseId(event.target.value)}>
        {contexts.map(context => {
          const group = demo.courses.find(course => course.courseId === context.courseId);
          const studentNames = group ? demo.students.filter(student =>
            isTopicAssigned(group, context.topicId, student.id)
          ).map(student => student.displayName) : [];
          return <option key={context.courseId} value={context.courseId}>
            {names.get(context.courseId) ?? "Saved course"} — {studentNames.length
              ? studentNames.join(", ") : "no students yet"}
            {context.stage === "idea" ? " (Think Tank)" : ""}
          </option>;
        })}
      </select>

    </div>}
    <StudentAssignmentEditor
      course={selectedCourse} topicId={active.topicId}
      onAssigned={() => onAssigned?.(active.courseId)}
      onClose={() => onClose?.(active.courseId)}
      onCancel={onCancel}/>
  </div>;
}
