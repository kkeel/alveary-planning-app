"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Info, Lightbulb, MoreHorizontal, SquareCheckBig, UsersRound } from "lucide-react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import type { CSSProperties } from "react";
import { subjectColor } from "../courses/legacy-subject-colors.mjs";
import CourseTopicReview from "./CourseTopicReview";
import SharedPriorityEditor from "./SharedPriorityEditor";
import SharedArrangementEditor from "./SharedArrangementEditor";
import FloatingChoiceMenu from "./FloatingChoiceMenu";
import { coursePriorityRollup } from "./shared-priority.mjs";
import { isTopicAssigned } from "./topic-assignment.mjs";
import CourseInfoDisclosure from "./CourseInfoDisclosure";
import PlanningScheduleGradeMeta from "./PlanningScheduleGradeMeta";
import DetailViewSwitch from "./DetailViewSwitch";
import { buildTopicSharingIndex, hasSharedTopic } from "./topic-sharing";
import PlacementSymbol from "./PlacementSymbol";
import { effectiveTopicCount } from "./topic-assignment.mjs";
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
  sharedArrangements: ReturnType<typeof useDemoPlan>["sharedArrangements"]) {
  // If a single topic has been assigned via an individual override, include
  // that student even when no combined-course assignment exists.
  const includedCount = course.topics.filter(topic => topic.included).length;
  const assigned = people.filter(student => effectiveTopicCount(course, student.id) > 0);
  if (!assigned.length) return "Students to be decided";
  return assigned.map((student, index) => {
    const defaultArrangement = courseArrangement(arrangements,course.courseId,student.id,sharedArrangements);
    const topicsAssigned = effectiveTopicCount(course, student.id);
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
    </span>;
  });
}

/** My Plan shares Think Tank's list, accordion, metadata and neutral disclosure
 * styling, but its selection symbol is a check and its student actions edit
 * existing assignments through the same editor used when first adding them. */
export default function MyPlanPanel({ focusCourseId = null, focusRevision = 0, onBrowseCourses }: { focusCourseId?: string | null; focusRevision?: number; sideBySide?: boolean; onBrowseCourses?: () => void }) {
  const demo = useDemoPlan();
  const desk = usePlanningDesk();
  // One open course across all My Plan subjects, just as in Think Tank.
  const [openId, setOpenId] = useState<string | null>(null);
  const [infoId, setInfoId] = useState<string | null>(null);
  const [hiddenDetailedCourseIds, setHiddenDetailedCourseIds] = useState<string[]>([]);
  const [editingStudentsId, setEditingStudentsId] = useState<string | null>(null);
  const [editingTopicCourseId, setEditingTopicCourseId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [collapsedSubjects, setCollapsedSubjects] = useState<string[]>([]);
  const moreButtons=useRef<Map<string,HTMLButtonElement>>(new Map());
  const pendingAnchor = useRef<{ row: HTMLElement; top: number; scroller: HTMLElement | null } | null>(null);

  // Changes autosave immediately. Keep a course with its last student removed
  // visible only while the editing form still needs a reachable Done button.
  const planned = demo.courses.filter(c => c.stage === "planned" ||
    (c.stage === "idea" && c.courseId === openId &&
      (editingStudentsId === c.courseId || editingTopicCourseId === c.courseId)));
  const sharedTopics = useMemo(() =>
    buildTopicSharingIndex(demo.courses, demo.students),
    [demo.courses, demo.students]);

  useEffect(() => {
    if (focusCourseId && planned.some(c => c.courseId === focusCourseId)) {
      setOpenId(focusCourseId);
      setInfoId(null);
      setOpenMenuId(null);
    }
  // Follow actual Add/Done events only, not ordinary server refreshes.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusCourseId, focusRevision]);

  // Keep a clicked row under the pointer when opening it collapses another
  // course above it, matching the Think Tank's global single-open behavior.
  function rememberAnchor(element: HTMLElement) {
    const row = element.closest(".pd-idea") as HTMLElement | null;
    const scroller = element.closest(".pd-body, .pd-full-column-body") as HTMLElement | null;
    if (row) pendingAnchor.current = {
      row, top: row.getBoundingClientRect().top, scroller,
    };
  }
  useLayoutEffect(() => {
    const anchor = pendingAnchor.current;
    pendingAnchor.current = null;
    if (!anchor?.row.isConnected) return;
    const delta = anchor.row.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) < 1) return;
    if (anchor.scroller && anchor.scroller.scrollHeight > anchor.scroller.clientHeight + 2)
      anchor.scroller.scrollTop += delta;
    else window.scrollBy(0, delta);
  }, [openId]);

  function toggleDetails(courseId: string, target: HTMLElement) {
    if (desk.planDetails === "compact") {
      rememberAnchor(target);
      const next = openId === courseId ? null : courseId;
      setOpenId(next);
      setInfoId(next ? courseId : null);
    } else {
      if (desk.planDetails === "detailed")
        setHiddenDetailedCourseIds(previous => previous.includes(courseId)
          ? previous.filter(id => id !== courseId) : [...previous, courseId]);
      else setInfoId(previous => previous === courseId ? null : courseId);
    }
    setEditingStudentsId(null);
    setEditingTopicCourseId(null);
    setOpenMenuId(null);
  }
  function toggleStudentEdit(courseId: string, target: HTMLElement) {
    if (openId !== courseId) rememberAnchor(target);
    const next = editingStudentsId === courseId ? null : courseId;
    setOpenId(courseId);
    setEditingStudentsId(next);
    setEditingTopicCourseId(null);
    setOpenMenuId(null);
  }

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
    {planned.length > 0 && <p className="pd-intro myplan-intro pd-planning-guidance">Your chosen courses, with details available when needed.</p>}
    <div className="pd-details-toolbar">
      <DetailViewSwitch label="My Plan" value={desk.planDetails}
        onChange={next => { desk.setPlanDetails(next); setOpenId(editingStudentsId ?? editingTopicCourseId); setInfoId(null); setHiddenDetailedCourseIds([]); }}/>
    </div>
    {!planned.length && <div className="pd-empty-state">
      <h3>Your plan starts here</h3>
      <p>Add students to a course or topic from the Course List to see it in My Plan.</p>
      <Link className="pd-empty-action" href="/courses"
        onClick={() => {desk.setCourseMode("browse"); onBrowseCourses?.();}}>Browse courses</Link>
    </div>}
    <div className="pd-subject-list">
      {groups.map(([subject, courses]) => {
        const collapsed = collapsedSubjects.includes(subject);
        // Apply the palette at section scope, exactly as Think Tank does, so
        // expanded My Plan details inherit the matching subject-colored rail.
        return <section className="pd-subject" key={subject}
          style={{
            "--pd-subject-wash": subjectColor(subject) + "15",
            "--pd-subject-edge": subjectColor(subject) + "66",
            "--pd-subject-color": subjectColor(subject),
          } as CSSProperties}>
          <div className="pd-subject-heading">
            <button type="button" className="pd-subject-toggle" aria-expanded={!collapsed}
              onClick={() => {
                if (!collapsed && courses.some(course => course.courseId === openId)) {
                  setOpenId(null);
                  setInfoId(null);
                  setEditingStudentsId(null);
                  setEditingTopicCourseId(null);
                  setOpenMenuId(null);
                }
                setCollapsedSubjects(previous => collapsed
                  ? previous.filter(value => value !== subject) : [...previous,subject]);
              }}>
              {collapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
              <strong>{subject}</strong><span>{courses.length}</span>
            </button>
          </div>
          {!collapsed && <div className="pd-subject-items pd-think-course-list">
            {courses.map(course => {
              const item: CatalogCourse | undefined = lookup.get(course.courseId);
              const hasTopics = item?.type === "Combined Course";
              const infoOpen = desk.planDetails === "detailed"
                ? !hiddenDetailedCourseIds.includes(course.courseId)
                : infoId === course.courseId;
              const editing = editingStudentsId === course.courseId;
              const open = Boolean(
                (desk.planDetails === "topics" && hasTopics) ||
                (desk.planDetails === "detailed" && (hasTopics || infoOpen)) ||
                (desk.planDetails === "compact" && openId === course.courseId) ||
                infoOpen || editing || editingTopicCourseId === course.courseId);
              const topicsOnly = desk.planDetails === "topics" && hasTopics &&
                !infoOpen && !editing && editingTopicCourseId !== course.courseId;
              const detailsId = "pd-myplan-details-" + course.courseId;
              const shared = hasSharedTopic(sharedTopics, course);
              const menuOpen = openMenuId === course.courseId;
              const title = item?.title ?? "Saved course";
              const selectedTopicIds = course.topics.filter(topic => topic.included &&
                demo.students.some(student=>isTopicAssigned(course,topic.topicId,student.id)))
                .map(topic=>topic.topicId);
              const displayPriority=coursePriorityRollup(
                demo.sharedPriorities,demo.assignmentPriorities,
                course,demo.students,selectedTopicIds);
              return <div className={"pd-idea myplan-row" + (open ? " is-open" : "") + (topicsOnly ? " is-topics-only" : "") + (desk.planDetails === "detailed" ? " is-detailed" : "")}
                key={course.courseId}>
                <div className="pd-idea-heading">
                  <button className="pd-idea-review" type="button" aria-expanded={open}
                    aria-controls={detailsId}
                    onClick={event => toggleDetails(course.courseId,event.currentTarget)}>
                    <SquareCheckBig size={14} className="pd-plan-choice-mark" aria-hidden="true"/>
                    <span>{title}
                      <small className="myplan-summary">
                        {studentSummary(course,demo.students,demo.assignmentArrangements,demo.sharedArrangements)}
                        {shared && <span className="pd-course-shared"
                          title="A topic is also assigned in another planned course"
                          aria-label="Shared topic"> ↔</span>}
                      </small>
                    </span>
                  </button>
                  <button type="button" className="planning-icon-control pd-row-tool pd-mini-info-action"
                    aria-label={(infoOpen?"Hide":"View")+" guidance for "+title}
                    title={infoOpen?"Hide guidance":"View guidance"}
                    aria-expanded={infoOpen} aria-controls={detailsId}
                    onClick={event=>toggleDetails(course.courseId,event.currentTarget)}>
                    <Info size={15} aria-hidden="true"/>
                  </button>
                  <SharedPriorityEditor courseId={course.courseId}
                    selectedTopicIds={selectedTopicIds} displayPriority={displayPriority}/>
                  <SharedArrangementEditor courseId={course.courseId}
                    selectedTopicIds={selectedTopicIds}/>
                  <div className="pd-more-anchor">
                  <button type="button" className="planning-icon-control pd-more"
                    ref={element=>{if(element) moreButtons.current.set(course.courseId,element);
                      else moreButtons.current.delete(course.courseId);}}
                    aria-controls={"pd-myplan-menu-"+course.courseId}
                    aria-label={"More options for " + title}
                    title={"More options for " + title}
                    aria-expanded={menuOpen}
                    onClick={() => setOpenMenuId(menuOpen ? null : course.courseId)}>
                    <MoreHorizontal size={16} aria-hidden="true"/>
                  </button>
                                <FloatingChoiceMenu open={menuOpen}
                  triggerRef={{current:moreButtons.current.get(course.courseId)??null}}
                  onDismiss={()=>setOpenMenuId(null)}
                  id={"pd-myplan-menu-"+course.courseId} className="floating-icon-menu"
                  label={"More options for "+title}>
                  <Link href={"/books?course="+encodeURIComponent(course.courseId)}
                    onClick={()=>setOpenMenuId(null)}
                    title={"View books for "+title} aria-label={"View books for "+title}>
                    <BookOpen size={17} aria-hidden="true"/>
                    <span className="pd-sr-only">View books</span>
                  </Link>
                  <button type="button" onClick={event=>
                    toggleStudentEdit(course.courseId,event.currentTarget)}
                    title={editing?"Close student editor":"Edit students"}
                    aria-label={editing?"Close student editor":"Edit students"} aria-expanded={editing}>
                    <UsersRound size={17} aria-hidden="true"/>
                    <span className="pd-sr-only">{editing ? "Close students" : "Edit students"}</span>
                  </button>
                  <button type="button" onClick={() => {
                    demo.setStage(course.courseId,"idea");
                    setOpenId(null);
                    setInfoId(null);
                    setEditingStudentsId(null);
                    setEditingTopicCourseId(null);
                    setOpenMenuId(null);
                  }} title="Return to Think Tank" aria-label="Return to Think Tank">
                    <Lightbulb size={17} aria-hidden="true"/>
                    <span className="pd-sr-only">Return to Think Tank</span>
                  </button>
                </FloatingChoiceMenu>
                  </div>
</div>
                {open && <div className="pd-review pd-think-review myplan-review"
                  id={detailsId} role="region" aria-label={"Details for " + title}>
                  {item && infoOpen && <div className="pd-course-inline-details">
                     <PlanningScheduleGradeMeta course={item} detailed/>
                     <CourseInfoDisclosure course={item}/>
                   </div>}
                   {editing && <div className="pd-assign-in-place myplan-assign-in-place">
                    <StudentAssignmentEditor course={course}
                      onClose={() => {
                        setEditingStudentsId(null);
                        if (course.stage === "idea") setOpenId(null);
                      }}
                      onCancel={() => {
                        setEditingStudentsId(null);
                        if (course.stage === "idea") setOpenId(null);
                      }}/>
                  </div>}
                  {item && <CourseTopicReview parent={item} savedChoice={course} mode="plan" detailMode={desk.planDetails === "detailed" && !infoOpen ? "topics" : desk.planDetails}
                    onToggleTopic={(topicId,included) =>
                      demo.setTopic(course.courseId,topicId,included)}
                    onTopicDone={sourceCourseId => {
                      const source = demo.courses.find(c => c.courseId === sourceCourseId);
                      if (source?.stage === "planned") setOpenId(sourceCourseId);
                      else setOpenId(null);
                    }}
                    onTopicCancel={() => {
                      if (course.stage === "idea") setOpenId(null);
                    }}
                    onTopicEditingChange={isEditing =>
                      setEditingTopicCourseId(isEditing ? course.courseId : null)}/>}
                </div>}
              </div>;
            })}
          </div>}
        </section>;
      })}
    </div>
  </section>;
}
