"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import catalog from "../courses/catalog-preview.json";

type CatalogCourse = (typeof catalog.courses)[number];
const lookup = new Map(catalog.courses.map(c => [c.id, c]));
const compare = (a: SavedCourse, b: SavedCourse) => {
  const x = lookup.get(a.courseId), y = lookup.get(b.courseId);
  return (x?.presentationSort ?? "").localeCompare(y?.presentationSort ?? "") ||
    a.courseId.localeCompare(b.courseId);
};
function studentSummary(course: SavedCourse,
  people: ReturnType<typeof useDemoPlan>["students"],
  preferences: ReturnType<typeof useDemoPlan>["studentPreferences"]): string {
  const assigned = people.filter(s => course.studentIds.includes(s.id));
  if (!assigned.length) return "Choose students when you're ready";
  return assigned.map(s => {
    const pref = preferences.find(p => p.courseId === course.courseId && p.studentId === s.id);
    return [s.displayName, pref?.priority ?? null,
      pref?.arrangement !== "Later" ? pref?.arrangement : null].filter(Boolean).join(" · ");
  }).join("  /  ");
}

export default function MyPlanPanel({ focusCourseId = null }: { focusCourseId?: string | null }) {
  const demo = useDemoPlan();
  const desk = usePlanningDesk();
  const [openId, setOpenId] = useState<string | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<string[]>([]);
  const planned = demo.courses.filter(c => c.stage === "planned");

  useEffect(() => {
    if (focusCourseId && planned.some(c => c.courseId === focusCourseId)) {
      setOpenId(focusCourseId);
    }
  // Focus is set explicitly when moving from Think Tank, not on data refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCourseId]);

  const groups = useMemo(() => {
    const sections = new Map<string, SavedCourse[]>();
    for (const choice of planned) {
      const subject = lookup.get(choice.courseId)?.subject ?? "Other";
      sections.set(subject, [...(sections.get(subject) ?? []), choice]);
    }
    const all = [...sections.entries()];
    all.sort((a,b) => {
      const aa = a[1].map(c => lookup.get(c.courseId)?.subjectSort ?? 9999);
      const bb = b[1].map(c => lookup.get(c.courseId)?.subjectSort ?? 9999);
      return Math.min(...aa) - Math.min(...bb) || a[0].localeCompare(b[0]);
    });
    return all.map(([subject, items]) => [subject, [...items].sort(compare)] as const);
  }, [planned]);

  if (!demo.ready) return <div className="pd-plan-empty">
    <p>{demo.error ?? "Opening your saved family plan…"}</p>
  </div>;

  return <section className="myplan-panel" aria-label="My Plan">
    <p className="pd-intro myplan-intro">
      Courses you're planning to use. Open any course to review its details or adjust students.
    </p>
    {!planned.length && <div className="pd-plan-empty">
      <p>Your plan can begin with just one course. The rest of your ideas can stay in the Think Tank.</p>
      <button type="button" onClick={() => desk.setTab("think")}>Explore Think Tank</button>
    </div>}
    <div className="pd-subject-list">
      {groups.map(([subject, courses]) => {
        const collapsed = collapsedSubjects.includes(subject);
        return <section className="pd-subject" key={subject}>
          <div className="pd-subject-heading">
            <button type="button" className="pd-subject-toggle" aria-expanded={!collapsed}
              onClick={() => setCollapsedSubjects(v => collapsed
                ? v.filter(x => x !== subject) : [...v, subject])}>
              {collapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
              <strong>{subject}</strong><span>{courses.length}</span>
            </button>
          </div>
          {!collapsed && <div className="pd-subject-items">
            {courses.map(course => {
              const courseCatalog: CatalogCourse | undefined = lookup.get(course.courseId);
              const open = openId === course.courseId;
              const includedCount = course.topics.filter(t => t.included).length;
              const countLabel = courseCatalog?.type === "Combined Course"
                ? " · " + includedCount + " of " + course.topics.length + " topics"
                : "";
              return <div className={"pd-idea myplan-row" + (open ? " is-expanded" : "")}
                key={course.courseId}>
                <div className="pd-idea-heading">
                  <button className="pd-idea-review" type="button" aria-expanded={open}
                    onClick={() => setOpenId(open ? null : course.courseId)}>
                    {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    <span>
                      {courseCatalog?.title ?? "Saved course"}
                      <small className="myplan-summary">
                        {studentSummary(course,demo.students,demo.studentPreferences)}{countLabel}
                      </small>
                    </span>
                  </button>
                </div>
                {open && <div className="pd-review myplan-review">
                  <StudentAssignmentEditor course={course} showCourseInfo/>
                  <button type="button" className="myplan-return"
                    onClick={() => { demo.setStage(course.courseId, "idea"); setOpenId(null); }}>
                    Return to Think Tank
                  </button>
                </div>}
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
    {!!planned.length && <p className="myplan-footer-note">
      Your other ideas can stay in the Think Tank as long as you like.
    </p>}
  </section>;
}
