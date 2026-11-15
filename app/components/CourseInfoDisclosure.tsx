"use client";

import catalog from "../courses/catalog-preview.json";

type Course = (typeof catalog.courses)[number];

/** Just the information itself. Think Tank displays it immediately; My Plan
 * controls its one "Description & tips" disclosure in the course row. */
export default function CourseInfoDisclosure({ course }: { course: Course }) {
  if (!course.description && !course.tips) return null;
  return <div className="pd-course-description-tips">
    {course.description && <p className="pd-review-description">{course.description}</p>}
    {course.tips && <div className="pd-course-tips">
      <strong>Placement &amp; combining tips</strong>
      <p>{course.tips}</p>
    </div>}
  </div>;
}
