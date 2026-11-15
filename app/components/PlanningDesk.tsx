"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, BookOpen, BookmarkCheck, ChevronDown, ChevronRight,
  Lightbulb, Maximize2, Minimize2, MoreHorizontal, PanelRightClose, PanelRightOpen, RotateCcw, X, Plus,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlanningDesk } from "./PlanningDeskContext";
import { useDemoPlan } from "./DemoPlanContext";
import MyPlanPanel from "./MyPlanPanel";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import CourseInfoDisclosure from "./CourseInfoDisclosure";
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

export default function PlanningDesk() {
  const desk = usePlanningDesk();
  const cloud = useDemoPlan();
  const pathname = usePathname();
  const onBooks = pathname.replace(/\/$/, "") === "/books";
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [wideDesk, setWideDesk] = useState(false);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [justPlannedId, setJustPlannedId] = useState<string | null>(null);

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
  // Keep the row being actively edited in place after an assignment succeeds.
  // It moves out of Think Tank only when the member leaves this review/tab.
  const ideas = useMemo(() => desk.thinkTankIds
    .filter(id => !plannedIds.has(id) || justPlannedId === id)
    .map(id => lookup.get(id))
    .filter((plan): plan is CatalogPlan => Boolean(plan)),
  [desk.thinkTankIds, plannedIds, justPlannedId]);
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
  const subjectOrder = desk.subjectOrder.filter(subject => grouped.has(subject));
  // New subjects arrive beside their curriculum-order neighbors; manually
  // arranged existing subject stacks retain their relative placement.
  for (const subject of suggestedSubjects) {
    if (subjectOrder.includes(subject)) continue;
    const at = suggestedSubjects.indexOf(subject);
    const before = suggestedSubjects.slice(0, at).reverse().find(id => subjectOrder.includes(id));
    const after = suggestedSubjects.slice(at + 1).find(id => subjectOrder.includes(id));
    if (before) subjectOrder.splice(subjectOrder.indexOf(before) + 1, 0, subject);
    else if (after) subjectOrder.splice(subjectOrder.indexOf(after), 0, subject);
    else subjectOrder.push(subject);
  }

  function orderedIdeas(subject: string) {
    const items = grouped.get(subject) ?? [];
    const previous = desk.orderedIdsBySubject[subject] ?? [];
    if (!previous.length) return items;
    const arranged = previous.filter(id => items.some(item => item.id === id));
    const suggested = items.map(item => item.id);
    for (const id of suggested) {
      if (arranged.includes(id)) continue;
      const at = suggested.indexOf(id);
      const before = suggested.slice(0, at).reverse().find(x => arranged.includes(x));
      const after = suggested.slice(at + 1).find(x => arranged.includes(x));
      if (before) arranged.splice(arranged.indexOf(before) + 1, 0, id);
      else if (after) arranged.splice(arranged.indexOf(after), 0, id);
      else arranged.push(id);
    }
    return arranged.map(id => lookup.get(id)).filter((plan): plan is CatalogPlan => Boolean(plan));
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

  const summaries = <div className="pd-quiet-summary">
    <button type="button" onClick={() => selectTab("think")}>
      Think Tank · {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
    </button>
    <button type="button" onClick={() => selectTab("plan")}>
      My Plan · {plannedIds.size} selections
    </button>
  </div>;

  return <div className={"pd-wrapper" + (drawerOpen ? " is-mobile-open" : "") +
    (wideDesk ? " is-wide" : "")}>
    <button type="button" className="pd-mobile-launcher"
      aria-label={"Open Planning Desk. " + ideas.length + " Think Tank ideas"}
      title="Open Planning Desk" aria-expanded={drawerOpen}
      onClick={() => { desk.setQuiet(false); setDrawerOpen(true); }}>
      <Lightbulb size={25} aria-hidden="true"/>
      {ideas.length > 0 && <span className="pd-mobile-count" aria-hidden="true">{ideas.length > 99 ? "99+" : ideas.length}</span>}
    </button>
    {drawerOpen && <button type="button" className="pd-mobile-scrim"
      aria-label="Close Planning Desk" onClick={closeMobileDrawer} />}

    {desk.quiet ? <aside className="pd-quiet" aria-label="Quiet Planning Desk">
      <div className="pd-quiet-head">
        <span><Lightbulb size={16} /> Your Planning Desk</span>
        <button type="button" aria-label="Open Planning Desk" title="Open Planning Desk"
          onClick={() => desk.setQuiet(false)}><PanelRightOpen size={17}/></button>
      </div>
      {summaries}
    </aside> : <aside className="pd-desk" aria-label="Your Planning Desk">
      <header className="pd-header">
        <div className="pd-title"><Lightbulb size={20}/><h2>Your Planning Desk</h2></div>
        <div className="pd-header-actions">
          <span className={"pd-sync-status" + (cloud.error ? " is-error" : "")}
            role={cloud.error ? "alert" : "status"}
            aria-live="polite" title={cloud.error ?? undefined}>
            {cloud.error ? "Not saved" : cloud.saving ? "Saving…" : cloud.ready ? "Saved" : ""}
          </span>
          <button type="button" aria-label={wideDesk ? "Return to regular Planning Desk width" : "Expand Planning Desk"}
            title={wideDesk ? "Regular desk width" : "Wider planning space"}
            aria-pressed={wideDesk} onClick={() => setWideDesk(value => !value)}>
            {wideDesk ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
          </button>
          <button type="button" aria-label="Quiet the Planning Desk" title="Quiet the Planning Desk"
            onClick={() => {desk.setQuiet(true); closeMobileDrawer();}}><PanelRightClose size={19}/></button>
        </div>
      </header>

      <div className="pd-tabs" role="tablist" aria-label="Planning Desk sections">
        <button role="tab" type="button" aria-selected={desk.tab === "think"}
          className={desk.tab === "think" ? "is-active" : ""} onClick={() => selectTab("think")}>
          Think Tank <span>{ideas.length}</span>
        </button>
        <button role="tab" type="button" aria-selected={desk.tab === "plan"}
          className={desk.tab === "plan" ? "is-active" : ""} onClick={() => selectTab("plan")}>
          My Plan <span>{plannedIds.size}</span>
        </button>
      </div>

      <div className="pd-body">
        {cloud.ready && unsynced.length > 0 && <div className="pd-save-browser">
          <strong>{unsynced.length} browser-only {unsynced.length === 1 ? "idea" : "ideas"}</strong>
          <p>Bring your existing Think Tank choices and topic customizations into your private Demo plan. This merges without overwriting choices already saved to your account.</p>
          <button type="button" onClick={saveLegacyIdeas} disabled={cloud.saving}>
            Save browser ideas to Demo plan
          </button>
        </div>}
        {cloud.error && <div className="pd-save-error-inline" role="alert">{cloud.error}</div>}
        {onBooks && <Link className="pd-return" href="/courses"
          onClick={() => {desk.setCourseMode("plan"); closeMobileDrawer();}}>
          <ArrowLeft size={14}/> Back to Course List · Planning
        </Link>}
        {desk.tab === "think" ? <>
          <p className="pd-intro">Ideas to consider for your school year.</p>
          {ideas.length ? <div className="pd-subject-list">
            {subjectOrder.map((subject, index) => {
              const list = orderedIdeas(subject);
              const isCollapsed = desk.collapsedSubjects.includes(subject);
              const subjectMenu = "subject:" + subject;
              return <section key={subject} className="pd-subject">
                <div className="pd-subject-heading">
                  <button className="pd-subject-toggle" type="button" aria-expanded={!isCollapsed}
                    onClick={() => desk.toggleSubject(subject)}>
                    {isCollapsed ? <ChevronRight size={15}/> : <ChevronDown size={15}/>}
                    <strong>{subject}</strong><span>{list.length}</span>
                  </button>
                  <button className="pd-more" type="button" aria-expanded={openMenu === subjectMenu}
                    aria-label={"Organize " + subject} title={"Organize " + subject}
                    onClick={() => setOpenMenu(openMenu === subjectMenu ? null : subjectMenu)}>
                    <MoreHorizontal size={17}/>
                  </button>
                </div>
                {openMenu === subjectMenu && <div className="pd-inline-actions">
                  <button type="button" disabled={index === 0}
                    onClick={() => {desk.moveSubject(subject, -1, suggestedSubjects); setOpenMenu(null);}}>
                    <ArrowUp size={13}/> Move up
                  </button>
                  <button type="button" disabled={index === subjectOrder.length - 1}
                    onClick={() => {desk.moveSubject(subject, 1, suggestedSubjects); setOpenMenu(null);}}>
                    <ArrowDown size={13}/> Move down
                  </button>
                  {desk.orderedIdsBySubject[subject]?.length > 0 && <button type="button"
                    onClick={() => {desk.resetIdeaOrder(subject); setOpenMenu(null);}}>
                    <RotateCcw size={13}/> Reset ideas
                  </button>}
                </div>}
                {!isCollapsed && <div className="pd-subject-items">
                  {list.map((idea, i) => {
                    const itemMenu = "idea:" + idea.id;
                    const courseTopics = topicConnections.get(idea.editionId) ?? [];
                    const excludedTopicIds = desk.excludedTopicIdsByCourse[idea.id] ?? [];
                    const excludedCount = courseTopics.filter(t => excludedTopicIds.includes(t.id)).length;
                    const isCustomized = excludedCount > 0;
                    const includedCount = courseTopics.length - excludedCount;
                    return <div className="pd-idea" key={idea.id}>
                      <div className="pd-idea-heading">
                        <button type="button" className="pd-idea-review" aria-expanded={reviewId === idea.id}
                          onClick={() => {
                            setReviewId(reviewId === idea.id ? null : idea.id);
                            if (reviewId !== idea.id) setJustPlannedId(null);
                          }}>
                          <BookmarkCheck size={14}/><span>{idea.title}
                            {isCustomized && <small className="pd-customized-label">Customized · {includedCount} of {courseTopics.length} topics</small>}
                          </span>
                          {reviewId === idea.id ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                        </button>
                        <button type="button" className="pd-more" aria-label={"Organize " + idea.title}
                          title={"Organize " + idea.title} aria-expanded={openMenu === itemMenu}
                          onClick={() => setOpenMenu(openMenu === itemMenu ? null : itemMenu)}>
                          <MoreHorizontal size={16}/>
                        </button>
                      </div>
                      {openMenu === itemMenu && <div className="pd-inline-actions">
                        <button type="button" disabled={i === 0}
                          onClick={() => {desk.moveIdea(subject, idea.id, -1, list.map(x => x.id)); setOpenMenu(null);}}>
                          <ArrowUp size={13}/> Up
                        </button>
                        <button type="button" disabled={i === list.length - 1}
                          onClick={() => {desk.moveIdea(subject, idea.id, 1, list.map(x => x.id)); setOpenMenu(null);}}>
                          <ArrowDown size={13}/> Down
                        </button>
                        <button type="button" onClick={() => {
                          desk.removeIdea(idea.id);
                          if (reviewId === idea.id) setReviewId(null);
                          setOpenMenu(null);
                        }}><X size={13}/> Remove</button>
                      </div>}
                      {reviewId === idea.id && <div className="pd-review">
                        <CourseInfoDisclosure course={idea}/>
                        <div className="pd-review-actions">
                          {cloud.ready && (justPlannedId === idea.id || plannedIds.has(idea.id)
                            ? <span className="pd-plan-added">In My Plan</span>
                            : <button type="button" className="pd-plan-action"
                                disabled={!cloud.courses.some(c => c.courseId === idea.id)}
                                title={!cloud.courses.some(c => c.courseId === idea.id)
                                  ? "Save this browser idea to your Demo plan first" : undefined}
                                onClick={() => {
                                  // Opening student choices does not promote
                                  // an unassigned idea into My Plan.
                                  setAssigningId(idea.id);
                                }}>
                                <Plus size={14} aria-hidden="true"/>
                                {idea.type === "Combined Course" ? "All" : "Plan"}
                              </button>)}
                          <Link className="pd-row-tool" href={"/books?course=" + encodeURIComponent(idea.id)}
                            aria-label={"View books for " + idea.title} title="View books"
                            onClick={closeMobileDrawer}>
                            <BookOpen size={15} aria-hidden="true"/>
                          </Link>
                        </div>
                        <CourseTopicReview parent={idea} mode="think"
                          savedChoice={cloud.courses.find(c => c.courseId === idea.id)}
                          excludedTopicIds={excludedTopicIds}
                          onToggleTopic={topicId =>
                            desk.toggleCourseTopic(idea.id, topicId, courseTopics.map(t => t.id))}
                        />
                        {assigningId === idea.id && cloud.courses.some(c => c.courseId === idea.id) &&
                          <div className="pd-assign-in-place">
                            <div className="pd-assignment-title">
                              <strong>Who will study these included topics?</strong>
                              <button type="button" className="pd-inline-edit"
                                onClick={() => {
                                  setAssigningId(null);
                                  setJustPlannedId(null);
                                }}>Hide</button>
                            </div>
                            <StudentAssignmentEditor
                              course={cloud.courses.find(c => c.courseId === idea.id)!}
                              onAssigned={() => setJustPlannedId(idea.id)}
                            />
                          </div>}
                        {assigningId === idea.id && justPlannedId === idea.id &&
                          cloud.courses.some(choice => choice.courseId === idea.id &&
                            choice.stage === "planned" && choice.studentIds.length > 0) &&
                          <div className="pd-done-row">
                          <button type="button" className="pd-done-action"
                            disabled={cloud.saving || Boolean(cloud.error)}
                            onClick={() => {
                              setReviewId(null);
                              setJustPlannedId(null);
                              setAssigningId(null);
                            }}>Done</button>
                          <small>Finished for now — this course moves out of Think Tank.</small>
                        </div>}
                      </div>}
                    </div>;
                  })}
                </div>}
              </section>;
            })}
          </div> : <p className="pd-empty">Save a course or topic with its bookmark to begin your Think Tank.</p>}
          <div className="pd-actions">
            {desk.subjectOrder.length > 0 && <button type="button"
              onClick={desk.resetSubjectOrder}><RotateCcw size={13}/> Restore subject order</button>}
          </div>
          <label className="pd-notes-label" htmlFor="pd-notes">Notes and ideas</label>
          <textarea id="pd-notes" value={desk.notes} onChange={e => desk.setNotes(e.target.value)}
            rows={3} placeholder="What are you considering?"/>
          <p className="pd-local-note">Notes and display preferences remain in this browser. Course choices are saved to your Demo plan after merging.</p>
        </> : <MyPlanPanel focusCourseId={justPlannedId} />}
      </div>
    </aside>}
  </div>;
}
