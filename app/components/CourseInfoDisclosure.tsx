"use client";

import catalog from "../courses/catalog-preview.json";
import PlacementSymbol from "./PlacementSymbol";

type Course = (typeof catalog.courses)[number];

/** Shared content for the neutral Description & tips disclosure in both
 * Think Tank and My Plan. No separate colored details treatment. */
export default function CourseInfoDisclosure({ course }: { course: Course }) {
  if (!course.description && !course.tips) return null;
  return <div className="pd-course-description-tips">
    {course.description && <p className="pd-review-description">{course.description}</p>}
    {course.tips && <div className="pd-course-tips" aria-label="Placement and combining tips">
      <PlacementSymbol size={17}/>
      <p>{course.tips}</p>
    </div>}
  </div>;
}
