"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BookOpen, ChevronDown, ChevronRight, Info,
  SquareCheckBig, Lightbulb, NotebookPen, Maximize2, MoreHorizontal,
  PanelRightClose, PanelRightOpen, X, Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { usePlanningDesk } from "./PlanningDeskContext";
import { useDemoPlan } from "./DemoPlanContext";
import MyPlanPanel from "./MyPlanPanel";
import type { CSSProperties } from "react";
import { subjectColor } from "../courses/legacy-subject-colors.mjs";
import DetailViewSwitch from "./DetailViewSwitch";
import { selectionTopicCount } from "./planning-topic-sections.mjs";
import { pendingIdeaCount, topicIsThinkTankIdea } from "../courses/list-row-status.mjs";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import CourseInfoDisclosure from "./CourseInfoDisclosure";
import PlanningScheduleGradeMeta from "./PlanningScheduleGradeMeta";
import CourseTopicReview from "./CourseTopicReview";
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
  const [reviewOverrides, setReviewOverrides] = useState<Record<string, boolean>>({});
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [courseInfoId, setCourseInfoId] = useState<string | null>(null);
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
    const narrow = window.matchMedia("(max-width: 1280px)").matches;
    const oldOverflow = document.body.style.overflow;
    if (narrow) document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      if (narrow) document.body.style.overflow = oldOverflow;
    };
  }, [drawerOpen]);

  const plannedIds = useMemo(() => new Set(
    cloud.courses.filter(c => c.stage === "planned").map(c => c.courseId)), [cloud.courses]);
  // A combined course is one saved choice that can appear in BOTH columns:
  // topics without any assigned student stay in Think Tank; assigned topics
  // appear in My Plan. Keep an editor visible until Done, even when its final
  // click assigns the last remaining topic.
  const ideas = useMemo(() => {
    // Source of truth is now the optimistic cloud snapshot, not only the old
    // browser bookmark list. A freshly added topic/course appears in the mini
    // desk on the very same click, even before local-storage rehydration runs.
    const ids = new Set([
      ...desk.thinkTankIds,
      ...cloud.courses.filter(choice => pendingIdeaCount(choice,cloud.students) > 0)
        .map(choice => choice.courseId),
    ]);
    return [...ids].filter(id => {
      const choice = cloud.courses.find(course => course.courseId === id);
      return !choice || pendingIdeaCount(choice,cloud.students) > 0 ||
        justPlannedId === id || assigningId === id;
    }).map(id => lookup.get(id))
      .filter((plan):plan is CatalogPlan => Boolean(plan));
  }, [desk.thinkTankIds, cloud.courses, cloud.students, justPlannedId, assigningId]);
  const unsynced = cloud.ready ? desk.thinkTankIds.filter(id =>
    !cloud.courses.some(c => c.courseId === id)) : [];
  const saveLegacyIdeas = () => {
    if (!unsynced.length) return;
    void cloud.importIdeas(unsynced.map(courseId => ({
      courseId,
      excludedTopicIds: desk.excludedTopicIdsByCourse[courseId] ?? [],
    })));
  };
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
  const notices = <>        {cloud.ready && unsynced.length > 0 && <div className="pd-save-browser">
          <strong>{unsynced.length} browser-only {unsynced.length === 1 ? "idea" : "ideas"}</strong>
          <p>Bring your existing Think Tank choices and topic customizations into your private Demo plan. This merges without overwriting choices already saved to your account.</p>
          <button type="button" onClick={saveLegacyIdeas} disabled={cloud.saving}>
            Save browser ideas to Demo plan
          </button>
        </div>}
  </>;
  const thinkTankContent = <>
          <div className="pd-details-toolbar">
            <p className="pd-intro">Ideas to consider for your school year.</p>
            {variant === "full" && <DetailViewSwitch label="Think Tank" value={desk.thinkDetails}
              onChange={mode => {
                desk.setThinkDetails(mode);
                setReviewOverrides({});
              }}/>}
          </div>
          {ideas.length ? <div className="pd-subject-list">
            {subjectOrder.map(subject => {
              const list = orderedIdeas(subject);
              const isCollapsed = desk.collapsedSubjects.includes(subject);
              return <section key={subject} className="pd-subject">
                <div className="pd-subject-heading"
                  style={{
                    "--pd-subject-wash": subjectColor(subject) + "15",
                    "--pd-subject-edge": subjectColor(subject) + "66",
                    "--pd-subject-color": subjectColor(subject),
                  } as CSSProperties}>
                  <button className="pd-subject-toggle" type="button" aria-expanded={!isCollapsed}
                    onClick={() => desk.toggleSubject(subject)}>
                    {isCollapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
                    <strong>{subject}</strong><span>{list.length}</span>
                  </button>
                </div>
                {!isCollapsed && <div className="pd-subject-items">
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
                    const reviewOpen = reviewOverrides[idea.id] ??
                      (variant === "full" && desk.thinkDetails === "expanded");
                    return <div className="pd-idea" key={idea.id}>
                      <div className="pd-idea-heading">
                        <button type="button" className="pd-idea-review" aria-expanded={reviewOpen}
                          onClick={() => {
                            setReviewOverrides(old => ({ ...old,[idea.id]:!reviewOpen }));
                            setCourseInfoId(null);
                            setJustPlannedId(null);
                          }}>
                          <Lightbulb size={14} aria-hidden="true"/><span>{idea.title}
                            {(showTopicCount || partiallyPlanned) && <small className="pd-topic-count-note">
                              {showTopicCount && <>{topicCount.selected} of {topicCount.total} topics</>}
                              {showTopicCount && partiallyPlanned && <span className="pd-meta-divider"> · </span>}
                              {partiallyPlanned && "Partial My Plan"}
                            </small>}
                            {reviewOpen && <PlanningScheduleGradeMeta course={idea}/>}
                          </span>
                        </button>
                        <button type="button"
                          className="pd-row-tool pd-mini-info-action"
                          title={reviewOpen ? "Hide details" : "View details"}
                          aria-label={(reviewOpen ? "Hide" : "View") + " details for " + idea.title}
                          aria-expanded={reviewOpen}
                          onClick={() => {
                            const next=!reviewOpen;
                            setReviewOverrides(old=>({...old,[idea.id]:next}));
                            // Opening the outer course never auto-expands its
                            // nested Description & tips disclosure.
                            setCourseInfoId(null);
                            setJustPlannedId(null);
                          }}>
                          <Info size={15} aria-hidden="true"/>
                        </button>
                        <Link className="pd-row-tool pd-think-books"
                          href={"/books?course=" + encodeURIComponent(idea.id)}
                          aria-label={"View books for " + idea.title}
                          title="View books" onClick={closeMobileDrawer}>
                          <BookOpen size={15} aria-hidden="true"/>
                        </Link>
                        {cloud.ready && <button type="button"
                          className="pd-plan-action pd-think-toolbar-plus"
                          aria-label={idea.type === "Combined Course"
                            ? "Add students to all included topics in " + idea.title
                            : "Add students to " + idea.title}
                          title={cloud.courses.some(c=>c.courseId===idea.id)
                            ? "Assign students"
                            : "Save this browser idea before assigning"}
                          aria-expanded={assigningId===idea.id}
                          disabled={!cloud.courses.some(c=>c.courseId===idea.id)}
                          onClick={() => {
                            const next=assigningId!==idea.id;
                            setAssigningId(next?idea.id:null);
                            setReviewOverrides(old=>({...old,[idea.id]:true}));
                            setCourseInfoId(null);
                            setJustPlannedId(null);
                          }}>
                          <Plus size={14} aria-hidden="true"/>
                          {idea.type === "Combined Course" && <span>All</span>}
                        </button>}
                        <button type="button" className="pd-more" aria-label={"More options for " + idea.title}
                          title={"More options for " + idea.title} aria-expanded={openMenu === itemMenu}
                          onClick={() => setOpenMenu(openMenu === itemMenu ? null : itemMenu)}>
                          <MoreHorizontal size={16}/>
                        </button>
                      </div>
                      {openMenu === itemMenu && <div className="pd-inline-actions">
                        <button type="button" onClick={() => {
                          // Remove only unscheduled ideas from Think Tank:
                          // never delete the saved parent or assignments in My Plan.
                          if (savedChoice && cloud.ready) {
                            if (savedChoice.ideaAll) cloud.toggleListIdea(idea.id,null);
                            else for(const topic of savedChoice.topics) {
                              if (topicIsThinkTankIdea(savedChoice,topic.topicId,cloud.students))
                                cloud.toggleListIdea(idea.id,topic.topicId);
                            }
                          } else desk.removeIdea(idea.id);
                          setReviewOverrides(old => {
                            const next = {...old}; delete next[idea.id]; return next;
                          });
                          setOpenMenu(null);
                        }}><X size={13}/> Remove</button>
                      </div>}
                      {reviewOpen && <div className="pd-review pd-think-review">
                        {(idea.description || idea.tips) && <div className="pd-think-description-section">
                          <button type="button" className="pd-plan-info-disclosure"
                            aria-expanded={courseInfoId===idea.id}
                            onClick={() => setCourseInfoId(courseInfoId===idea.id ? null : idea.id)}>
                            <Info size={14} aria-hidden="true"/> Description &amp; tips
                            {courseInfoId===idea.id
                              ? <ChevronDown size={13} aria-hidden="true"/>
                              : <ChevronRight size={13} aria-hidden="true"/>}
                          </button>
                          {courseInfoId===idea.id && <CourseInfoDisclosure course={idea}/>}
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
                        <CourseTopicReview parent={idea} mode="think"
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
          </div> : <p className="pd-empty">Save a course or topic with its bookmark to begin your Think Tank.</p>}
  </>;

  if (variant === "full") return <section className="pd-full-page" aria-label="Your Planning Desk">
    <div className="pd-full-status">
      <span className="pd-full-status-label"><NotebookPen size={16} aria-hidden="true"/> Your Planning Desk</span>
    </div>
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
          focusRevision={focusPlanned?.revision} />}
      </div>
    </aside>}
  </div>;
}
