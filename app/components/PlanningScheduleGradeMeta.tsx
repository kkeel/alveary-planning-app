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

function shortSchedule(course: Course): string | null {
  const schedules = course.schedules;
  if (!schedules.length) return null;
  const weekly = [...new Set(schedules.map(schedule => schedule.weekly).filter(
    (value): value is number => value !== null))];
  const minutes = [...new Set(schedules.map(schedule => schedule.minutes).filter(
    (value): value is number => value !== null))].sort((a,b) => a-b);
  const parts: string[] = [];
  if (weekly.length === 1) {
    const plus = schedules.some(schedule => schedule.weeklyPlus);
    parts.push(weekly[0] + (plus ? "+" : "") + "×/week");
  } else if (weekly.length > 1) parts.push("Frequency varies");
  if (minutes.length) {
    const range = minutes.length === 1 ? String(minutes[0]) :
      minutes[0] + "–" + minutes[minutes.length - 1];
    parts.push(range + (schedules.some(schedule => schedule.minutesPlus) ? "+" : "") + " min");
  }
  if (schedules.length > 1) parts.push("See grade recommendations");
  return parts.length ? parts.join(" · ") : schedules.length + " schedule options";
}

/** Published curriculum guidance only; NEVER actual member schedule placements.
 * The condensed line is shown during normal browsing. Exact published lines
 * (including Morning/Afternoon and teacher-attention symbols) stay available
 * in Detailed mode or an individual course/topic information disclosure. */
export default function PlanningScheduleGradeMeta({
  course, detailed = false,
}: { course: Course; detailed?: boolean }) {
  const displayGrade = course.gradeDisplay || gradeLabel(course.grades);
  const summary = shortSchedule(course);
  const schedules = [...course.schedules].sort((a,b)=>
    Number.parseInt(a.gradeBand ?? "0",10) - Number.parseInt(b.gradeBand ?? "0",10));
  return <span className={"pd-schedule-grade-meta" + (detailed ? " is-detailed" : "")}>
    {detailed
      ? schedules.length > 0 && <span className="pd-schedule-grade-lines">
          {schedules.map(schedule =>
            <span className="pd-schedule-grade-item" key={schedule.id}>{schedule.text}</span>)}
        </span>
      : summary && <span className="pd-schedule-summary">{summary}</span>}
    <span className={"pd-schedule-grade-range" +
      (summary || (detailed && schedules.length) ? " has-schedule" : "")}>
      {displayGrade}
    </span>
  </span>;
}
