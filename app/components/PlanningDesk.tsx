"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown, ArrowLeft, ArrowUp, BookOpen, BookmarkCheck, ChevronDown, ChevronRight,
  ClipboardList, Lightbulb, MoreHorizontal, PanelRightClose, PanelRightOpen, RotateCcw, X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { usePlanningDesk } from "./PlanningDeskContext";
import PlacementSymbol from "./PlacementSymbol";
import { sortTopicsForCourse } from "../courses/topic-order.mjs";
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

function PlacementNote({ text }: { text: string }) {
  return <div className="pd-placement-note">
    <span className="pd-placement-icon"><PlacementSymbol size={20}/></span>
    <p>{text}</p>
  </div>;
}

export default function PlanningDesk() {
  const desk = usePlanningDesk();
  const pathname = usePathname();
  const onBooks = pathname.replace(/\/$/, "") === "/books";
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [openTopicId, setOpenTopicId] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const ideas = useMemo(() => desk.thinkTankIds
    .map(id => lookup.get(id))
    .filter((plan): plan is CatalogPlan => Boolean(plan)), [desk.thinkTankIds]);
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
    desk.setTab(tab);
    desk.setQuiet(false);
    setDrawerOpen(true);
  }
  function closeMobileDrawer() { setDrawerOpen(false); setOpenMenu(null); }

  const selectedReview = reviewId ? lookup.get(reviewId) : null;
  const selectedTopics = selectedReview
    ? sortTopicsForCourse(selectedReview, topicConnections.get(selectedReview.editionId) ?? [])
    : [];

  const summaries = <div className="pd-quiet-summary">
    <button type="button" onClick={() => selectTab("think")}>
      Think Tank · {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
    </button>
    <button type="button" onClick={() => selectTab("plan")}>
      My Plan · 0 selections
    </button>
  </div>;

  return <div className={"pd-wrapper" + (drawerOpen ? " is-mobile-open" : "")}>
    <div className="pd-mobile-launcher" aria-label="Planning Desk summary">
      <div className="pd-mobile-label"><Lightbulb size={15}/> Planning Desk</div>
      {summaries}
    </div>
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
          <button type="button" aria-label="Quiet the Planning Desk" title="Quiet the Planning Desk"
            onClick={() => {desk.setQuiet(true); closeMobileDrawer();}}><PanelRightClose size={19}/></button>
          <button type="button" className="pd-mobile-close" aria-label="Close Planning Desk"
            onClick={closeMobileDrawer}><X size={20}/></button>
        </div>
      </header>

      <div className="pd-tabs" role="tablist" aria-label="Planning Desk sections">
        <button role="tab" type="button" aria-selected={desk.tab === "think"}
          className={desk.tab === "think" ? "is-active" : ""} onClick={() => desk.setTab("think")}>
          Think Tank <span>{ideas.length}</span>
        </button>
        <button role="tab" type="button" aria-selected={desk.tab === "plan"}
          className={desk.tab === "plan" ? "is-active" : ""} onClick={() => desk.setTab("plan")}>
          My Plan <span>0</span>
        </button>
      </div>

      <div className="pd-body">
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
                    return <div className="pd-idea" key={idea.id}>
                      <div className="pd-idea-heading">
                        <button type="button" className="pd-idea-review" aria-expanded={reviewId === idea.id}
                          onClick={() => {setReviewId(reviewId === idea.id ? null : idea.id); setOpenTopicId(null);}}>
                          <BookmarkCheck size={14}/><span>{idea.title}</span>
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
                      {selectedReview?.id === idea.id && <div className="pd-review">
                        {idea.description && <p className="pd-review-description">{idea.description}</p>}
                        {idea.tips && <PlacementNote text={idea.tips}/>}
                        {selectedTopics.length > 0 && <div className="pd-topic-review" aria-label="Included topics">
                          {selectedTopics.map(topic => {
                            const isOpen = openTopicId === topic.id;
                            return <div className="pd-topic-item" key={topic.id}>
                              <button type="button" className="pd-topic-toggle" aria-expanded={isOpen}
                                onClick={() => setOpenTopicId(isOpen ? null : topic.id)}>
                                {isOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                                <span>{topic.title}</span>
                              </button>
                              {isOpen && (topic.description || topic.tips) && <div className="pd-topic-info">
                                {topic.description && <p>{topic.description}</p>}
                                {topic.tips && <PlacementNote text={topic.tips}/>}
                              </div>}
                            </div>;
                          })}
                        </div>}
                        <Link className="pd-books-link" href="/books" onClick={closeMobileDrawer}>
                          <BookOpen size={15}/> View Books
                        </Link>
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
          <p className="pd-local-note">Saved in this browser for now.</p>
        </> : <div className="pd-plan-empty">
          <ClipboardList size={22}/>
          <h3>My Plan</h3>
          <p>Student assignments aren't connected yet. You'll be able to move ideas from the Think Tank into My Plan when that step is ready.</p>
          <button type="button" onClick={() => desk.setTab("think")}>Return to Think Tank</button>
        </div>}
      </div>
    </aside>}
  </div>;
}
