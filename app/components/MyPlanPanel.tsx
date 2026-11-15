"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Info } from "lucide-react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import CourseTopicReview from "./CourseTopicReview";
import CourseInfoDisclosure from "./CourseInfoDisclosure";
import catalog from "../courses/catalog-preview.json";

type CatalogCourse = (typeof catalog.courses)[number];
const lookup = new Map(catalog.courses.map(course => [course.id, course]));
const compare = (a: SavedCourse, b: SavedCourse) => {
  const x = lookup.get(a.courseId), y = lookup.get(b.courseId);
  return (x?.presentationSort ?? "").localeCompare(y?.presentationSort ?? "") ||
    a.courseId.localeCompare(b.courseId);
};
function studentSummary(course: SavedCourse,
  people: ReturnType<typeof useDemoPlan>["students"],
  preferences: ReturnType<typeof useDemoPlan>["studentPreferences"]): string {
  // If a single topic has been assigned via an individual override, include
  // that student even when no combined-course assignment exists.
  const assigned = people.filter(student =>
    course.studentIds.includes(student.id) ||
    course.topics.some(t => t.included && course.overrides.some(o =>
      o.topicId === t.topicId && o.studentId === student.id && o.assigned)));
  if (!assigned.length) return "Students to be decided";
  return assigned.map(student => {
    const pref = preferences.find(p => p.courseId === course.courseId && p.studentId === student.id);
    return [student.displayName, pref?.priority ?? null,
      pref?.arrangement !== "Later" ? pref?.arrangement : null].filter(Boolean).join(" · ");
  }).join("  /  ");
}

export default function MyPlanPanel({ focusCourseId = null }: { focusCourseId?: string | null }) {
  const demo = useDemoPlan();
  const desk = usePlanningDesk();
  const [openId, setOpenId] = useState<string | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [editingStudentsId, setEditingStudentsId] = useState<string | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<string[]>([]);
  const planned = demo.courses.filter(c => c.stage === "planned");

  useEffect(() => {
    if (focusCourseId && planned.some(c => c.courseId === focusCourseId))
      setOpenId(focusCourseId);
  // Deliberately follow explicit navigation intent, not every server refresh.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCourseId]);

  const groups = useMemo(() => {
    const sections = new Map<string, SavedCourse[]>();
    for (const course of planned) {
      const subject = lookup.get(course.courseId)?.subject ?? "Other";
      sections.set(subject, [...(sections.get(subject) ?? []), course]);
    }
    const entries = [...sections.entries()];
    entries.sort((a, b) => {
      const ar = a[1].map(c => lookup.get(c.courseId)?.subjectSort ?? 9999);
      const br = b[1].map(c => lookup.get(c.courseId)?.subjectSort ?? 9999);
      return Math.min(...ar) - Math.min(...br) || a[0].localeCompare(b[0]);
    });
    return entries.map(([subject, courses]) => [subject, courses.sort(compare)] as const);
  }, [planned]);

  if (!demo.ready) return <div className="pd-plan-empty">
    <p>{demo.error ?? "Opening your saved family plan…"}</p>
  </div>;

  return <section className="myplan-panel" aria-label="My Plan">
    <p className="pd-intro myplan-intro">Your chosen courses, with details available whenever you need them.</p>
    {!planned.length && <div className="pd-plan-empty">
      <p>Start with one course or topic. The others can stay in Think Tank as long as you like.</p>
      <button type="button" onClick={() => desk.setTab("think")}>Open Think Tank</button>
    </div>}
    <div className="pd-subject-list">
      {groups.map(([subject, courses]) => {
        const collapsed = collapsedSubjects.includes(subject);
        return <section className="pd-subject" key={subject}>
          <div className="pd-subject-heading">
            <button type="button" className="pd-subject-toggle" aria-expanded={!collapsed}
              onClick={() => setCollapsedSubjects(previous => collapsed
                ? previous.filter(value => value !== subject) : [...previous,subject])}>
              {collapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
              <strong>{subject}</strong><span>{courses.length}</span>
            </button>
          </div>
          {!collapsed && <div className="pd-subject-items">
            {courses.map(course => {
              const item: CatalogCourse | undefined = lookup.get(course.courseId);
              const open = openId === course.courseId;
              const infoOpen = infoId === course.courseId;
              const editing = editingStudentsId === course.courseId;
              const includedCount = course.topics.filter(topic => topic.included).length;
              return <div className={"pd-idea myplan-row" + (open ? " is-expanded" : "")}
                key={course.courseId}>
                <div className="pd-idea-heading">
                  <button className="pd-idea-review" type="button" aria-expanded={open}
                    onClick={() => setOpenId(open ? null : course.courseId)}>
                    {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    <span>
                      {item?.title ?? "Saved course"}
                      <small className="myplan-summary">
                        {studentSummary(course,demo.students,demo.studentPreferences)}
                        {item?.type === "Combined Course" &&
                          " · " + includedCount + " of " + course.topics.length + " topics"}
                      </small>
                    </span>
                  </button>
                  <button type="button" className="pd-row-tool" aria-expanded={infoOpen}
                    aria-label={"Description and tips for " + (item?.title ?? "course")}
                    title="View description and tips"
                    onClick={() => setInfoId(infoOpen ? null : course.courseId)}>
                    <Info size={15}/>
                  </button>
                  <Link className="pd-row-tool" href="/books"
                    aria-label={"View books for " + (item?.title ?? "course")}
                    title="View Books"><BookOpen size={15}/></Link>
                </div>
                {infoOpen && item && <div className="pd-inline-info">
                  <CourseInfoDisclosure course={item}/>
                </div>}
                {open && <div className="pd-review myplan-review">
                  {item && <CourseTopicReview parent={item} savedChoice={course} mode="plan"
                    onToggleTopic={(topicId,included) =>
                      demo.setTopic(course.courseId,topicId,included)}/>}
                  <div className="pd-review-actions">
                    <button type="button" className="pd-plan-action"
                      aria-expanded={editing}
                      onClick={() => setEditingStudentsId(editing ? null : course.courseId)}>
                      {editing ? "Done editing students" : "Edit students & priorities"}
                    </button>
                    <button type="button" className="myplan-return" onClick={() => {
                      demo.setStage(course.courseId, "idea");
                      setOpenId(null); setEditingStudentsId(null);
                    }}>Return to Think Tank</button>
                  </div>
                  {editing && <StudentAssignmentEditor course={course}/>}
                </div>}
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </section>;
}
