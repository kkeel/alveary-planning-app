"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import catalog from "../courses/catalog-preview.json";

type Course = (typeof catalog.courses)[number];

export default function CourseInfoDisclosure({ course }: { course: Course }) {
  const [descriptionOpen, setDescriptionOpen] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  if (!course.description && !course.tips) return null;
  return <div className="pd-info-disclosures">
    {course.description && <section>
      <button className="pd-info-toggle" type="button" aria-expanded={descriptionOpen}
        onClick={() => setDescriptionOpen(value => !value)}>
        {descriptionOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        Description
      </button>
      {descriptionOpen && <p className="pd-review-description">{course.description}</p>}
    </section>}
    {course.tips && <section>
      <button className="pd-info-toggle" type="button" aria-expanded={tipsOpen}
        onClick={() => setTipsOpen(value => !value)}>
        {tipsOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        Placement &amp; combining tips
      </button>
      {tipsOpen && <p className="pd-review-description">{course.tips}</p>}
    </section>}
  </div>;
}
