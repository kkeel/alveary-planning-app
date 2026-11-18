"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Info,
  SquareCheckBig, Lightbulb, NotebookPen, Maximize2, MoreHorizontal,
  PanelRightClose, PanelRightOpen, X, Plus, UsersRound, Trash2,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePlanningDesk } from "./PlanningDeskContext";
import { useDemoPlan } from "./DemoPlanContext";
import MyPlanPanel from "./MyPlanPanel";
import type { CSSProperties } from "react";
import { subjectColor } from "../courses/legacy-subject-colors.mjs";
import { selectionTopicCount } from "./planning-topic-sections.mjs";
import { toggleThinkCourse } from "./think-tank-accordion.mjs";
import { pendingIdeaCount, topicIsThinkTankIdea } from "../courses/list-row-status.mjs";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import CourseInfoDisclosure from "./CourseInfoDisclosure";
import PlanningScheduleGradeMeta from "./PlanningScheduleGradeMeta";
import DetailViewSwitch from "./DetailViewSwitch";
import CourseTopicReview from "./CourseTopicReview";
import SharedPriorityEditor from "./SharedPriorityEditor";
import SharedArrangementEditor from "./SharedArrangementEditor";
import FloatingChoiceMenu from "./FloatingChoiceMenu";
import catalog from "../courses/catalog-preview.json";
import "./planning-desk.css";

type CatalogPlan = (typeof catalog.courses)[number];
const lookup = new Map(catalog.courses.map(p => [p.id, p]));
const byEdition = new Map(catalog.courses.map(p => [p.editionId, p]));
const topicConnections = new Map<string, CatalogPlan[]>();
for (const connection of catalog.topicLinks) {
  const topic = byEdition.get(connection.childEditionId);
  if (!topic) continue;
  const existing = topicConnections.get(connection.parentEditionId) ?? [];
  topicConnections.set(connection.parentEditionId, [...existing, topic]);
}
const sorted = (a: CatalogPlan, b: CatalogPlan) =>
  a.presentationSort.localeCompare(b.presentationSort) ||
  a.sort.localeCompare(b.sort) || a.id.localeCompare(b.id);

export default function PlanningDesk({ variant = "portable" }: { variant?: "portable" | "full" }) {
  const desk = usePlanningDesk();
  const cloud = useDemoPlan();
  const pathname = usePathname();
  const router = useRouter();
  const onBooks = pathname.replace(/\/$/, "") === "/books";
  // A locally opened course in Compact. Expanded/Detailed show all topics.
  const [openThinkCourseId, setOpenThinkCourseId] = useState<string | null>(null);
  const pendingThinkAnchor = useRef<{ row: HTMLElement; top: number; scroller: HTMLElement | null } | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [courseInfoId, setCourseInfoId] = useState<string | null>(null);
  const moreButtons=useRef<Map<string,HTMLButtonElement>>(new Map());
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [justPlannedId, setJustPlannedId] = useState<string | null>(null);
  // Keep My Plan focus independent from the temporary Think Tank row pin.
  // Done can release the row while still opening the corresponding right-side
  // course, including when its student was already checked before editing.
  const [focusPlanned, setFocusPlanned] = useState<{ courseId: string; revision: number } | null>(null);
  function focusMyPlan(courseId: string) {
    setFocusPlanned(previous => ({ courseId, revision: (previous?.revision ?? 0) + 1 }));
  }

  useEffect(() => {
    if (!drawerOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const oldOverflow = document.body.style.overflow;
    // Match the real container-query slide-out state, not a viewport width.
    // The navigation rail can collapse without any window resize, so observe
    // workspace width and release the scroll lock if the desk becomes inline.
    function syncScrollLock() {
      const scrim = document.querySelector<HTMLElement>(
        ".pd-wrapper.is-mobile-open > .pd-mobile-scrim");
      const overlayVisible = Boolean(scrim &&
        window.getComputedStyle(scrim).display !== "none");
      document.body.style.overflow = overlayVisible ? "hidden" : oldOverflow;
    }
    syncScrollLock();
    const workspace = document.querySelector<HTMLElement>(".shell-workspace");
    const observer = workspace && typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(syncScrollLock) : null;
    if (workspace && observer) observer.observe(workspace);
    window.addEventListener("resize", syncScrollLock);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", syncScrollLock);
      observer?.disconnect();
      document.body.style.overflow = oldOverflow;
    };
  }, [drawerOpen]);

  const plannedIds = useMemo(() => new Set(
    cloud.courses.filter(c => c.stage === "planned").map(c => c.courseId)), [cloud.courses]);
  // A combined course is one saved choice that can appear in BOTH columns:
  // topics without any assigned student stay in Think Tank; assigned topics
  // appear in My Plan. Keep an editor visible until Done, even when its final
  // click assigns the last remaining topic.
  // Saved course selections come only from DemoPlanContext. Do not translate
  // browser bookmarks into delete requests: the local preferences provider
  // retires old bookmarks without touching the authenticated server plan.
  const ideas = useMemo(() => cloud.courses
    .filter(choice=>pendingIdeaCount(choice,cloud.students)>0 ||
      (choice.courseId===justPlannedId || choice.courseId===assigningId))
    .map(choice=>lookup.get(choice.courseId))
    .filter((plan):plan is CatalogPlan => Boolean(plan)),
    [cloud.courses,cloud.students,justPlannedId,assigningId]);
  const grouped = useMemo(() => {
    const map = new Map<string, CatalogPlan[]>();
    for (const idea of ideas) map.set(idea.subject, [...(map.get(idea.subject) ?? []), idea]);
    for (const items of map.values()) items.sort(sorted);
    return map;
  }, [ideas]);

  const suggestedSubjects = [...grouped.keys()].sort((a, b) => {
    const ar = grouped.get(a)?.[0]?.subjectSort ?? 999;
    const br = grouped.get(b)?.[0]?.subjectSort ?? 999;
    return ar - br || a.localeCompare(b);
  });
  // Follow published curriculum order; the old move controls are retired.
  const subjectOrder = suggestedSubjects;
  function orderedIdeas(subject: string) {
    return grouped.get(subject) ?? [];
  }

  const activeThinkCourseId = openThinkCourseId &&
    ideas.some(idea => idea.id === openThinkCourseId) ? openThinkCourseId : null;

  // Collapsing a different, earlier course must not yank the clicked course
  // away from the pointer. Preserve its position within the scrollable desk.
  function rememberThinkAnchor(element: HTMLElement) {
    const row = element.closest(".pd-idea") as HTMLElement | null;
    const scroller = element.closest(".pd-body, .pd-full-column-body") as HTMLElement | null;
    if (row) pendingThinkAnchor.current = {
      row, top: row.getBoundingClientRect().top, scroller,
    };
  }
  useLayoutEffect(() => {
    const anchor = pendingThinkAnchor.current;
    pendingThinkAnchor.current = null;
    if (!anchor?.row.isConnected) return;
    const delta = anchor.row.getBoundingClientRect().top - anchor.top;
    if (Math.abs(delta) < 1) return;
    if (anchor.scroller && anchor.scroller.scrollHeight > anchor.scroller.clientHeight + 2) {
      anchor.scroller.scrollTop += delta;
    } else {
      window.scrollBy(0, delta);
    }
  }, [activeThinkCourseId]);

  function toggleThinkDetails(courseId: string, target: HTMLElement) {
    if (desk.thinkDetails === "compact") {
      rememberThinkAnchor(target);
      const next = toggleThinkCourse(activeThinkCourseId, courseId);
      setOpenThinkCourseId(next);
      setCourseInfoId(next ? courseId : null);
    } else {
      // In Expanded the title and i reveal this course's own guidance.
      // Detailed starts with guidance visible, but can hide it per course.
      const hidden = "hidden:" + courseId;
      setCourseInfoId(previous => desk.thinkDetails === "detailed"
        ? (previous === hidden ? null : hidden)
        : (previous === courseId ? null : courseId));
    }
    setAssigningId(null);
    setOpenMenu(null);
    setJustPlannedId(null);
  }

  function openThinkForAssignment(courseId: string, target: HTMLElement) {
    if (activeThinkCourseId !== courseId) rememberThinkAnchor(target);
    else pendingThinkAnchor.current = null;
    setOpenThinkCourseId(courseId);

    setCourseInfoId(null);
    setOpenMenu(null);
    setJustPlannedId(null);
  }

  function selectTab(tab: "think" | "plan") {
    if (tab === "plan") {
      setJustPlannedId(null);
      setAssigningId(null);
    }
    desk.setTab(tab);
    desk.setQuiet(false);
    setDrawerOpen(true);
  }
  function closeMobileDrawer() { setDrawerOpen(false); setOpenMenu(null); }
  function openFullPlanningDesk() {
    // Same destination as the List | Planning toggle. The Books portable
    // desk can open it too, by navigating back to Courses after selecting it.
    desk.setCourseMode("plan");
    closeMobileDrawer();
    if (onBooks) router.push("/courses");
  }

  const summaries = <div className="pd-quiet-summary">
    <button type="button" onClick={() => selectTab("think")}>
      <Lightbulb size={14} aria-hidden="true"/> Think Tank · {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
    </button>
    <button type="button" onClick={() => selectTab("plan")}>
      <SquareCheckBig size={14} aria-hidden="true"/> My Plan · {plannedIds.size} selections
    </button>
  </div>;


  // Render one shared set of planning components in either the compact tabs
  // or two visible columns. List and Planning never mount both desk variants.
  const notices = null;
  const thinkTankContent = <>
          <div className="pd-details-toolbar">
            {ideas.length > 0 && <p className="pd-intro">Ideas to consider for your school year.</p>}
            <DetailViewSwitch label="Think Tank" value={desk.thinkDetails}
              onChange={next => { desk.setThinkDetails(next); setOpenThinkCourseId(assigningId); setCourseInfoId(null); }}/>
          </div>
          {ideas.length ? <div className="pd-subject-list">
            {subjectOrder.map(subject => {
              const list = orderedIdeas(subject);
              const isCollapsed = desk.collapsedSubjects.includes(subject);
              // Share the subject palette with the expanded course details as well
              // as the heading, so the opened left rail matches that subject.
              return <section key={subject} className="pd-subject"
                style={{
                  "--pd-subject-wash": subjectColor(subject) + "15",
                  "--pd-subject-edge": subjectColor(subject) + "66",
                  "--pd-subject-color": subjectColor(subject),
                } as CSSProperties}>
                <div className="pd-subject-heading">
                  <button className="pd-subject-toggle" type="button" aria-expanded={!isCollapsed}
                    onClick={() => {
                      // A closed subject cannot retain a hidden expanded course.
                      if (!isCollapsed && list.some(idea => idea.id === activeThinkCourseId)) {
                        setOpenThinkCourseId(null);

                        setCourseInfoId(null);
                        setAssigningId(null);
                        setJustPlannedId(null);
                      }
                      desk.toggleSubject(subject);
                    }}>
                    {isCollapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
                    <strong>{subject}</strong><span>{list.length}</span>
                  </button>
                </div>
                {!isCollapsed && <div className="pd-subject-items pd-think-course-list">
                  {list.map(idea => {
                    const itemMenu = "idea:" + idea.id;
                    const courseTopics = topicConnections.get(idea.editionId) ?? [];
                    const excludedTopicIds = desk.excludedTopicIdsByCourse[idea.id] ?? [];
                    const savedChoice = cloud.courses.find(course => course.courseId === idea.id);
                    const topicCount=selectionTopicCount(
                      savedChoice,courseTopics,cloud.students,"think",excludedTopicIds);
                    const showTopicCount=topicCount.total>1 &&
                      topicCount.selected<topicCount.total;
                    const remainingCount = savedChoice
                      ? pendingIdeaCount(savedChoice,cloud.students) : 0;
                    const partiallyPlanned = savedChoice?.stage === "planned" && remainingCount > 0;
                    const selectedTopicIds = savedChoice?.topics.filter(topic =>
                      topicIsThinkTankIdea(savedChoice,topic.topicId,cloud.students))
                      .map(topic=>topic.topicId) ?? [];
                    const reviewOpen = desk.thinkDetails !== "compact" || activeThinkCourseId === idea.id;
                     const infoOpen = desk.thinkDetails === "detailed"
                       ? courseInfoId !== "hidden:" + idea.id : courseInfoId === idea.id;
                    const reviewId = "pd-think-details-" + idea.id;
                    return <div className={"pd-idea" + (reviewOpen ? " is-open" : "")} key={idea.id}>
                      <div className="pd-idea-heading">
                        <button type="button" className="pd-idea-review" aria-expanded={reviewOpen}
                          aria-controls={reviewId}
                          onClick={event => toggleThinkDetails(idea.id, event.currentTarget)}>
                          <Lightbulb size={14} aria-hidden="true"/><span>{idea.title}
                            {(showTopicCount || partiallyPlanned) && <small className="pd-topic-count-note">
                              {showTopicCount && <>{topicCount.selected} of {topicCount.total} topics</>}
                              {showTopicCount && partiallyPlanned && <span className="pd-meta-divider"> · </span>}
                              {partiallyPlanned && "Partial My Plan"}
                            </small>}
                             {reviewOpen && <PlanningScheduleGradeMeta course={idea}/>}
                          </span>
                        </button>
                        {savedChoice && <SharedPriorityEditor courseId={idea.id}
                          selectedTopicIds={selectedTopicIds}/>}
                        {savedChoice && <SharedArrangementEditor courseId={idea.id}
                          selectedTopicIds={selectedTopicIds}/>}
                        <button type="button" className="planning-icon-control pd-row-tool pd-mini-info-action"
                          title={infoOpen ? "Hide guidance" : "View guidance"}
                          aria-label={(infoOpen ? "Hide" : "View") + " guidance for " + idea.title}
                          aria-expanded={infoOpen} aria-controls={reviewId}
                          onClick={event => toggleThinkDetails(idea.id,event.currentTarget)}>
                          <Info size={15} aria-hidden="true"/>
                        </button>
                        <div className="pd-more-anchor">
                        <button type="button" className="planning-icon-control pd-more"
                          ref={element=>{if(element) moreButtons.current.set(idea.id,element);
                            else moreButtons.current.delete(idea.id);}}
                          aria-controls={"pd-think-menu-"+idea.id}
                          aria-label={"More options for " + idea.title}
                          title={"More options for " + idea.title} aria-expanded={openMenu === itemMenu}
                          onClick={() => setOpenMenu(openMenu === itemMenu ? null : itemMenu)}>
                          <MoreHorizontal size={16}/>
                        </button>
                                            <FloatingChoiceMenu open={openMenu===itemMenu}
                        triggerRef={{current:moreButtons.current.get(idea.id)??null}}
                        onDismiss={()=>setOpenMenu(null)}
                        id={"pd-think-menu-"+idea.id} className="floating-icon-menu"
                        label={"More options for "+idea.title}>
                        <Link href={"/books?course="+encodeURIComponent(idea.id)}
                          onClick={closeMobileDrawer}
                          title={"View books for "+idea.title} aria-label={"View books for "+idea.title}>
                          <BookOpen size={17} aria-hidden="true"/>
                          <span className="pd-sr-only">View books</span>
                        </Link>
                        {cloud.ready && savedChoice && <button type="button"
                          onClick={event=>{
                            const next=assigningId!==idea.id;
                            openThinkForAssignment(idea.id, event.currentTarget);
                            setAssigningId(next?idea.id:null);
                          }}
                          title={assigningId===idea.id?"Close students":"Add / edit students"}
                          aria-label={assigningId===idea.id?"Close students":"Add / edit students"}
                          aria-expanded={assigningId===idea.id}>
                          <UsersRound size={17} aria-hidden="true"/>
                          <span className="pd-sr-only">{assigningId===idea.id?"Close students":"Add / edit students"}</span>
                        </button>}
                        <button type="button" title="Remove idea" aria-label="Remove idea" onClick={() => {
                          // Remove only unscheduled ideas from Think Tank:
                          // never delete the saved parent or assignments in My Plan.
                          if (savedChoice && cloud.ready) {
                            if (savedChoice.ideaAll) cloud.toggleListIdea(idea.id,null);
                            else for(const topic of savedChoice.topics) {
                              if (topicIsThinkTankIdea(savedChoice,topic.topicId,cloud.students))
                                cloud.toggleListIdea(idea.id,topic.topicId);
                            }
                          } else desk.removeIdea(idea.id);
                          if (activeThinkCourseId === idea.id) {
                            setOpenThinkCourseId(null);

                            setCourseInfoId(null);
                            setAssigningId(null);
                            setJustPlannedId(null);
                          }
                          setOpenMenu(null);
                        }}>
                          <Trash2 size={17} aria-hidden="true"/>
                          <span className="pd-sr-only">Remove idea</span>
                        </button>
                      </FloatingChoiceMenu>
                        </div>
</div>
                      {reviewOpen && <div className="pd-review pd-think-review" id={reviewId}
                        role="region" aria-label={"Details for " + idea.title}>
                        {infoOpen && <div className="pd-course-inline-details">
                          <PlanningScheduleGradeMeta course={idea} detailed/>
                          <CourseInfoDisclosure course={idea}/>
                        </div>}
                        {plannedIds.has(idea.id) && !partiallyPlanned && <span className="pd-plan-added">
                          In My Plan
                        </span>}
                        {assigningId === idea.id && cloud.courses.some(c => c.courseId === idea.id) &&
                          <div className="pd-assign-in-place">
                            <StudentAssignmentEditor
                              course={cloud.courses.find(c => c.courseId === idea.id)!}
                              onAssigned={() => {
                                setJustPlannedId(idea.id);
                                focusMyPlan(idea.id);
                              }}
                              onCancel={() => {
                                setAssigningId(null);
                                setJustPlannedId(null);
                              }}
                              onClose={() => {
                                setAssigningId(null);
                                setJustPlannedId(null);
                                focusMyPlan(idea.id);
                              }}
                            />
                          </div>}
                        <CourseTopicReview parent={idea} mode="think" detailMode={desk.thinkDetails}
                          savedChoice={savedChoice}
                          excludedTopicIds={excludedTopicIds}
                          onToggleTopic={(topicId,include) => {
                            if (savedChoice && cloud.ready)
                              cloud.setTopic(idea.id,topicId,include);
                            else desk.toggleCourseTopic(idea.id,topicId,courseTopics.map(t=>t.id));
                          }}
                          onTopicAssigned={sourceCourseId => {
                            // Editing a shared edition through another parent must
                            // focus THAT course, never the course used to open it.
                            if (sourceCourseId === idea.id) setJustPlannedId(idea.id);
                            focusMyPlan(sourceCourseId);
                          }}
                          onTopicDone={sourceCourseId => {
                            setJustPlannedId(null);
                            focusMyPlan(sourceCourseId);
                          }}
                          onTopicCancel={() => setJustPlannedId(null)}
                        />

                      </div>}
                    </div>;
                  })}
                </div>}
              </section>;
            })}
          </div> : <div className="pd-empty-state">
            <h3>Your Think Tank is empty</h3>
            <p>Explore the Course List and use a lightbulb to save a course or topic you want to consider.</p>
            <Link className="pd-empty-action" href="/courses"
              onClick={() => {desk.setCourseMode("browse"); closeMobileDrawer();}}>
              Browse courses
            </Link>
          </div>}
  </>;

  if (variant === "full") return <section className="pd-full-page" aria-label="Your Planning Desk">
    <div className="pd-full-columns">
      <section className="pd-full-column" aria-label="Think Tank">
        <header className="pd-full-column-heading">
          <h2><Lightbulb size={19} aria-hidden="true"/> Think Tank</h2>
          <span className="pd-full-count">{ideas.length} {ideas.length === 1 ? "idea" : "ideas"}</span>
        </header>
        <div className="pd-full-column-body">
          {notices}
          {thinkTankContent}
        </div>
      </section>
      <section className="pd-full-column" aria-label="My Plan">
        <header className="pd-full-column-heading">
          <h2><SquareCheckBig size={19} aria-hidden="true"/> My Plan</h2>
          <span className="pd-full-count">{plannedIds.size} {plannedIds.size === 1 ? "selection" : "selections"}</span>
        </header>
        <div className="pd-full-column-body">
          <MyPlanPanel focusCourseId={focusPlanned?.courseId}
            focusRevision={focusPlanned?.revision} sideBySide />
        </div>
      </section>
    </div>
  </section>;

  return <div className={"pd-wrapper" + (drawerOpen ? " is-mobile-open" : "")}>
    <button type="button" className="pd-mobile-launcher"
      aria-label={"Open Planning Desk. " + ideas.length + " Think Tank ideas"}
      title="Open Planning Desk" aria-expanded={drawerOpen}
      onClick={() => { desk.setQuiet(false); setDrawerOpen(true); }}>
      <NotebookPen size={25} aria-hidden="true"/>
      {ideas.length > 0 && <span className="pd-mobile-count" aria-hidden="true">{ideas.length > 99 ? "99+" : ideas.length}</span>}
    </button>
    {drawerOpen && <button type="button" className="pd-mobile-scrim"
      aria-label="Close Planning Desk" onClick={closeMobileDrawer} />}

    {desk.quiet ? <aside className="pd-quiet" aria-label="Quiet Planning Desk">
      <div className="pd-quiet-head">
        <span><NotebookPen size={16} /> Your Planning Desk</span>
        <button type="button" aria-label="Open Planning Desk" title="Open Planning Desk"
          onClick={() => desk.setQuiet(false)}><PanelRightOpen size={17}/></button>
      </div>
      {summaries}
    </aside> : <aside className="pd-desk" aria-label="Your Planning Desk">
      <header className="pd-header">
        <div className="pd-title"><NotebookPen size={20}/><h2>Your Planning Desk</h2></div>
        <div className="pd-header-actions">
          <button type="button" aria-label="Open full-page Planning Desk"
            title="Open full-page Planning Desk"
            onClick={openFullPlanningDesk}>
            <Maximize2 size={17} aria-hidden="true"/>
          </button>
          <button type="button" aria-label="Quiet the Planning Desk" title="Quiet the Planning Desk"
            onClick={() => {desk.setQuiet(true); closeMobileDrawer();}}><PanelRightClose size={19}/></button>
        </div>
      </header>

      <div className="pd-tabs" role="tablist" aria-label="Planning Desk sections">
        <button role="tab" type="button" aria-selected={desk.tab === "think"}
          className={desk.tab === "think" ? "is-active" : ""} onClick={() => selectTab("think")}>
          <Lightbulb size={14} aria-hidden="true"/> Think Tank <span>{ideas.length}</span>
        </button>
        <button role="tab" type="button" aria-selected={desk.tab === "plan"}
          className={desk.tab === "plan" ? "is-active" : ""} onClick={() => selectTab("plan")}>
          <SquareCheckBig size={14} aria-hidden="true"/> My Plan <span>{plannedIds.size}</span>
        </button>
      </div>

      <div className="pd-body">
        {notices}
        {onBooks && <Link className="pd-return" href="/courses"
          onClick={() => {desk.setCourseMode("browse"); closeMobileDrawer();}}>
          <ArrowLeft size={14}/> Back to Course List
        </Link>}
        {desk.tab === "think" ? thinkTankContent : <MyPlanPanel focusCourseId={focusPlanned?.courseId}
          focusRevision={focusPlanned?.revision} onBrowseCourses={closeMobileDrawer} />}
      </div>
    </aside>}
  </div>;
}
