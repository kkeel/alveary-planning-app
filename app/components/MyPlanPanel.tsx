"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Info, UsersRound } from "lucide-react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import DetailViewSwitch from "./DetailViewSwitch";
import type { CSSProperties } from "react";
import { subjectColor } from "../courses/legacy-subject-colors.mjs";
import CourseTopicReview from "./CourseTopicReview";
import CourseInfoDisclosure from "./CourseInfoDisclosure";
import CourseCustomizationNote from "./CourseCustomizationNote";
import { buildTopicSharingIndex, hasSharedTopic } from "./topic-sharing";
import PlacementSymbol from "./PlacementSymbol";
import { effectiveTopicCount } from "./topic-assignment.mjs";
import { coursePriority } from "./priority-inheritance.mjs";
import { courseArrangement } from "./arrangement-inheritance.mjs";
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
  arrangements: ReturnType<typeof useDemoPlan>["assignmentArrangements"],
  priorities: ReturnType<typeof useDemoPlan>["assignmentPriorities"]) {
  // If a single topic has been assigned via an individual override, include
  // that student even when no combined-course assignment exists.
  const includedCount = course.topics.filter(topic => topic.included).length;
  const assigned = people.filter(student => effectiveTopicCount(course, student.id) > 0);
  if (!assigned.length) return "Students to be decided";
  return assigned.map((student, index) => {
    const defaultArrangement = courseArrangement(arrangements,course.courseId,student.id);
    const topicsAssigned = effectiveTopicCount(course, student.id);
    const defaultPriority = coursePriority(priorities, course.courseId,student.id);
    const hasTopicOverrides = priorities.some(p => p.courseId === course.courseId &&
      p.studentId === student.id && p.topicId !== null);
    return <span className="myplan-student-summary" key={student.id}>
      {index > 0 && <span className="myplan-student-separator"> / </span>}
      {student.displayName}
      {includedCount > 1 && topicsAssigned < includedCount &&
        <span className="myplan-topic-count" title="Individual topic assignment">
          {" · " + topicsAssigned + " of " + includedCount + " topics"}
        </span>}
      {defaultArrangement === "Combined" && <span className="myplan-combined-symbol"
        title="Combined arrangement" aria-label="Combined arrangement">
        <PlacementSymbol size={14}/>
      </span>}
      {defaultPriority && <span> · {defaultPriority}</span>}
      {hasTopicOverrides && <span className="myplan-topic-priorities"
        title="Some topics have individual priority settings"> · Customized priorities</span>}
    </span>;
  });
}

export default function MyPlanPanel({ focusCourseId = null, focusRevision = 0, sideBySide = false }: { focusCourseId?: string | null; focusRevision?: number; sideBySide?: boolean }) {
  const demo = useDemoPlan();
  const desk = usePlanningDesk();
  const [openId, setOpenId] = useState<string | null>(null);
  const [openOverrides, setOpenOverrides] = useState<Record<string,boolean>>({});
  const [infoId, setInfoId] = useState<string | null>(null);
  const [editingStudentsId, setEditingStudentsId] = useState<string | null>(null);
  const [editingTopicCourseId, setEditingTopicCourseId] = useState<string | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<string[]>([]);
  // Keep a now-unassigned parent visible only while its editor is open.
  // Changes autosave immediately, but Done/Close should remain reachable
  // before the course fully returns to Think Tank.
  const planned = demo.courses.filter(c => c.stage === "planned" ||
    (c.stage === "idea" && c.courseId === openId &&
      (editingStudentsId === c.courseId || editingTopicCourseId === c.courseId)));
  const sharedTopics = useMemo(() =>
    buildTopicSharingIndex(demo.courses, demo.students),
    [demo.courses, demo.students]);

  useEffect(() => {
    if (focusCourseId && planned.some(c => c.courseId === focusCourseId)) {
      setOpenId(focusCourseId);
      setOpenOverrides(old => ({...old,[focusCourseId]:true}));
    }
  // Follow explicit Add/Done events, including repeated assignments to the
  // same combined course, without reopening on ordinary server refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCourseId, focusRevision]);

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
    <div className="pd-details-toolbar">
      <p className="pd-intro myplan-intro">Your chosen courses, with details available whenever you need them.</p>
      <DetailViewSwitch label="My Plan" value={desk.planDetails}
        onChange={mode => {
          desk.setPlanDetails(mode);
          setOpenOverrides({});
          setOpenId(null);
          setEditingStudentsId(null);
          setEditingTopicCourseId(null);
        }}/>
    </div>
    {!planned.length && <div className="pd-plan-empty">
      <p>{sideBySide ? "Choose a course or topic from the Think Tank alongside this plan to begin." :
        "Start with one course or topic. The others can stay in Think Tank as long as you like."}</p>
      {!sideBySide && <button type="button" onClick={() => desk.setTab("think")}>Open Think Tank</button>}
    </div>}
    <div className="pd-subject-list">
      {groups.map(([subject, courses]) => {
        const collapsed = collapsedSubjects.includes(subject);
        return <section className="pd-subject" key={subject}>
          <div className="pd-subject-heading"
            style={{
              "--pd-subject-wash": subjectColor(subject) + "15",
              "--pd-subject-edge": subjectColor(subject) + "66",
            } as CSSProperties}>
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
              const open = openOverrides[course.courseId] ??
                (desk.planDetails === "expanded" || openId === course.courseId);
              const infoOpen = infoId === course.courseId;
              const editing = editingStudentsId === course.courseId;
              const includedCount = course.topics.filter(topic => topic.included).length;
              const customized = item?.type === "Combined Course" &&
                includedCount !== course.topics.length;
              const shared = hasSharedTopic(sharedTopics, course);
              return <div className={"pd-idea myplan-row" + (open ? " is-expanded" : "")}
                key={course.courseId}>
                <div className="pd-idea-heading">
                  <button className="pd-idea-review" type="button" aria-expanded={open}
                    onClick={() => {
                      setOpenOverrides(old => ({...old,[course.courseId]:!open}));
                      setOpenId(open ? null : course.courseId);
                      // Reopening a course should never reveal a stale edit
                      // form until the member explicitly requests it.
                      setEditingStudentsId(null);
                      setEditingTopicCourseId(null);
                    }}>
                    {open ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                    <span>
                      {item?.title ?? "Saved course"}
                      {customized && <CourseCustomizationNote
                        included={includedCount} total={course.topics.length}/>}
                      <small className="myplan-summary">
                        {studentSummary(course,demo.students,demo.assignmentArrangements,demo.assignmentPriorities)}
                        {shared && <span className="pd-course-shared"
                          title="A topic is also assigned in another planned course"
                          aria-label="Shared topic"> ↔</span>}

                      </small>
                    </span>
                  </button>
                  <Link className="pd-row-tool" href={"/books?course=" + encodeURIComponent(course.courseId)}
                    aria-label={"View books for " + (item?.title ?? "course")}
                    title="View Books"><BookOpen size={15}/></Link>
                  <button type="button" className="pd-row-tool pd-course-edit-icon"
                    aria-label={"Edit students and priorities for " + (item?.title ?? "course")}
                    title="Edit students and priorities" aria-expanded={editing}
                    onClick={() => {
                      if (!open) {
                        setOpenId(course.courseId);
                        setOpenOverrides(old => ({...old,[course.courseId]:true}));
                      }
                      setEditingStudentsId(editing ? null : course.courseId);
                    }}>
                    <UsersRound size={15} aria-hidden="true"/>
                  </button>
                </div>
                {open && <div className="pd-review myplan-review">
                  {item && (item.description || item.tips) && <>
                    <button type="button" className="pd-plan-info-disclosure"
                      aria-expanded={infoOpen}
                      onClick={() => setInfoId(infoOpen ? null : course.courseId)}>
                      <Info size={14} aria-hidden="true"/> Description &amp; tips
                      {infoOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                    </button>
                    {infoOpen && <CourseInfoDisclosure course={item}/>}
                  </>}
                  {editing && <div className="pd-assign-in-place myplan-assign-in-place">
                    <StudentAssignmentEditor course={course}
                      onClose={() => {
                        setEditingStudentsId(null);
                        if (course.stage === "idea") setOpenId(null);
                      }}/>
                  </div>}
                  {item && <CourseTopicReview parent={item} savedChoice={course} mode="plan"
                    onToggleTopic={(topicId,included) =>
                      demo.setTopic(course.courseId,topicId,included)}
                    onTopicDone={sourceCourseId => {
                      const source = demo.courses.find(c => c.courseId === sourceCourseId);
                      if (source?.stage === "planned") {
                        setOpenId(sourceCourseId);
                        setOpenOverrides(old => ({...old,[sourceCourseId]:true}));
                      } else setOpenId(null);
                    }}
                    onTopicCancel={() => {
                      if (course.stage === "idea") setOpenId(null);
                    }}
                    onTopicEditingChange={editing =>
                      setEditingTopicCourseId(editing ? course.courseId : null)}/>} 
                  <div className="pd-review-actions">
                    <button type="button" className="myplan-return" onClick={() => {
                      demo.setStage(course.courseId, "idea");
                      setOpenId(null); setEditingStudentsId(null);
                      setEditingTopicCourseId(null);
                    }}>Return to Think Tank</button>
                  </div>
                </div>}
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </section>;
}
