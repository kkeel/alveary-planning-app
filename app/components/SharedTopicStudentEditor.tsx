"use client";

import { useMemo } from "react";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import catalog from "../courses/catalog-preview.json";

const names = new Map(catalog.courses.map(course => [course.id, course.title]));

function assignedToTopic(course: SavedCourse, topicId: string, studentId: string) {
  const override = course.overrides.find(item =>
    item.topicId === topicId && item.studentId === studentId);
  return override ? override.assigned : course.studentIds.includes(studentId);
}

/**
 * Edits topic-level assignments across every planned grouping that includes
 * the SAME catalog topic edition. This keeps provenance explicit: changing a
 * student's topic in one course does not silently alter the other group.
 */
export default function SharedTopicStudentEditor({
  topicEditionId, currentCourseId,
}: { topicEditionId: string; currentCourseId: string }) {
  const demo = useDemoPlan();
  const groups = useMemo(() => demo.courses.filter(course =>
    course.stage === "planned" &&
    course.topics.some(topic => topic.topicEditionId === topicEditionId && topic.included)
  ).sort((a,b) => (a.courseId === currentCourseId ? -1 : b.courseId === currentCourseId ? 1 : 0)),
  [demo.courses, topicEditionId, currentCourseId]);
  if (!groups.length) return <p className="plan-microcopy">No included planned course uses this topic yet.</p>;

  return <div className="pd-topic-shared-editor">
    <p className="plan-microcopy">
      Edit every student using this topic. The course beneath each checkbox shows
      where that assignment comes from.
    </p>
    {demo.students.map(student => <div className="pd-topic-student-sources" key={student.id}>
      <strong>{student.displayName}</strong>
      <div className="pd-topic-source-choices">
        {groups.map(group => {
          const topic = group.topics.find(item => item.topicEditionId === topicEditionId)!;
          const checked = assignedToTopic(group, topic.topicId, student.id);
          return <label key={group.courseId} className={checked ? "is-assigned" : ""}>
            <input type="checkbox" checked={checked}
              onChange={event => demo.assignTopic(group.courseId, topic.topicId,
                student.id, event.target.checked)}/>
            <span>{names.get(group.courseId) ?? "Course grouping"}</span>
          </label>;
        })}
      </div>
    </div>)}
    {!demo.students.length && <p className="plan-microcopy">Add a student to begin assigning this topic.</p>}
  </div>;
}
