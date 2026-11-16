/** Compact, shared course-level note. Topic exclusions belong beside the
 * course name in both Think Tank and My Plan, not among student details. */
export default function CourseCustomizationNote({
  included, total,
}: { included: number; total: number }) {
  if (total <= 1 || included >= total) return null;
  return <small className="pd-course-customized-note"
    title={included + " of " + total + " topics included; others removed"}>
    Customized · {included} of {total} topics
  </small>;
}
