import catalog from "../courses/catalog-preview.json";

type Course = (typeof catalog.courses)[number];

// Match the Course List's grade wording if an edition has no Display Grade.
function gradeLabel(grades: number[]): string {
  if (!grades.length) return "Grades vary";
  const values = [...new Set(grades)].sort((a, b) => a - b);
  if (values.length === 1) return "Grade " + values[0];
  if (values.length > 2 && values[values.length - 1] - values[0] === values.length - 1) {
    return "Grades " + values[0] + "–" + values[values.length - 1];
  }
  return "Grades " + values.join(", ");
}

/** Published recommendations only; never a member's actual scheduled placements.
 * Combined courses have grade metadata but topic-owned scheduling, so their
 * schedule lines remain at the nested topic level. */
export default function PlanningScheduleGradeMeta({ course }: { course: Course }) {
  const displayGrade = course.gradeDisplay || gradeLabel(course.grades);
  return <span className="pd-schedule-grade-meta">
    {course.schedules.length > 0 && <span className="pd-schedule-grade-lines">
      {course.schedules.map(schedule =>
        <span className="pd-schedule-grade-item" key={schedule.id}>{schedule.text}</span>)}
    </span>}
    <span className={"pd-schedule-grade-range" +
      (course.schedules.length ? " has-schedule" : "")}>
      {displayGrade}
    </span>
  </span>;
}
