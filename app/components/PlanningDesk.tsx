"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, BookOpen, BookmarkCheck, ChevronDown, ChevronRight, ClipboardList, Lightbulb, PanelRightClose, PanelRightOpen, RotateCcw, X } from "lucide-react";
import Link from "next/link";
import { usePlanningDesk } from "./PlanningDeskContext";
import catalog from "../courses/catalog-preview.json";
import "./planning-desk.css";

type CatalogPlan = (typeof catalog.courses)[number];
const lookup = new Map(catalog.courses.map(p => [p.id, p]));
const sorted = (a: CatalogPlan, b: CatalogPlan) =>
  a.presentationSort.localeCompare(b.presentationSort) ||
  a.sort.localeCompare(b.sort) || a.id.localeCompare(b.id);

export default function PlanningDesk() {
  const desk = usePlanningDesk();
  const [reviewId, setReviewId] = useState<string | null>(null);
  const ideas = useMemo(() => desk.thinkTankIds
    .map(id => lookup.get(id))
    .filter((p): p is CatalogPlan => Boolean(p)), [desk.thinkTankIds]);

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
  // If a new subject is saved after manual reordering, place it beside the
  // nearest still-visible curriculum neighbor without shifting older stacks.
  const subjectOrder = desk.subjectOrder.filter(x => grouped.has(x));
  for (const subject of suggestedSubjects) {
    if (subjectOrder.includes(subject)) continue;
    const location = suggestedSubjects.indexOf(subject);
    const before = suggestedSubjects.slice(0, location).reverse().find(x => subjectOrder.includes(x));
    const after = suggestedSubjects.slice(location + 1).find(x => subjectOrder.includes(x));
    if (before) subjectOrder.splice(subjectOrder.indexOf(before) + 1, 0, subject);
    else if (after) subjectOrder.splice(subjectOrder.indexOf(after), 0, subject);
    else subjectOrder.push(subject);
  }

  function orderedIdeas(subject: string) {
    const items = grouped.get(subject) ?? [];
    const order = desk.orderedIdsBySubject[subject] ?? [];
    if (!order.length) return items;
    // Manually moved items retain order, new ideas slot by their nearest
    // curriculum neighbor without rearranging the previously saved entries.
    const working = order.filter(id => items.some(item => item.id === id));
    const suggested = items.map(item => item.id);
    for (const id of suggested) {
      if (working.includes(id)) continue;
      const before = suggested.slice(0, suggested.indexOf(id)).reverse().find(x => working.includes(x));
      const after = suggested.slice(suggested.indexOf(id) + 1).find(x => working.includes(x));
      if (before) working.splice(working.indexOf(before) + 1, 0, id);
      else if (after) working.splice(working.indexOf(after), 0, id);
      else working.push(id);
    }
    return working.map(id => lookup.get(id)).filter((p): p is CatalogPlan => Boolean(p));
  }

  const selectedReview = reviewId ? lookup.get(reviewId) : null;

  if (desk.quiet) {
    return <aside className="pd-quiet" aria-label="Quiet Planning Desk">
      <div className="pd-quiet-head">
        <span><Lightbulb size={16} /> Your Planning Desk</span>
        <button type="button" title="Open Planning Desk" aria-label="Open Planning Desk" onClick={() => desk.setQuiet(false)}>
          <PanelRightOpen size={17} />
        </button>
      </div>
      <div className="pd-quiet-summary">
        <button type="button" onClick={() => {desk.setTab("think"); desk.setQuiet(false);}}>
          Think Tank · {ideas.length} {ideas.length === 1 ? "idea" : "ideas"}
        </button>
        <button type="button" onClick={() => {desk.setTab("plan"); desk.setQuiet(false);}}>
          My Plan · 0 selections
        </button>
      </div>
    </aside>;
  }

  return <aside className="pd-desk" aria-label="Your Planning Desk">
    <header className="pd-header">
      <div className="pd-title"><Lightbulb size={20}/><h2>Your Planning Desk</h2></div>
      <button type="button" aria-label="Quiet the Planning Desk" title="Quiet the Planning Desk" onClick={() => desk.setQuiet(true)}>
        <PanelRightClose size={19}/>
      </button>
    </header>
    <div className="pd-tabs" role="tablist" aria-label="Planning Desk sections">
      <button role="tab" type="button" aria-selected={desk.tab==="think"} className={desk.tab==="think"?"is-active":""} onClick={() => desk.setTab("think")}>
        Think Tank <span>{ideas.length}</span>
      </button>
      <button role="tab" type="button" aria-selected={desk.tab==="plan"} className={desk.tab==="plan"?"is-active":""} onClick={() => desk.setTab("plan")}>
        My Plan <span>0</span>
      </button>
    </div>
    {desk.tab === "think" ? <>
      <p className="pd-intro">Save courses you're considering. Organize them here, then assign students when you're ready.</p>
      {ideas.length ? <div className="pd-scroll">
        {subjectOrder.map((subject, index) => {
          const list = orderedIdeas(subject);
          const isCollapsed = desk.collapsedSubjects.includes(subject);
          return <section key={subject} className="pd-subject">
            <div className="pd-subject-heading">
              <button className="pd-subject-toggle" type="button" aria-expanded={!isCollapsed} onClick={()=>desk.toggleSubject(subject)}>
                {isCollapsed?<ChevronRight size={15}/>:<ChevronDown size={15}/>}
                <strong>{subject}</strong><span>{list.length}</span>
              </button>
              <button title={"Move "+subject+" up"} aria-label={"Move "+subject+" up"} type="button" disabled={index===0}
                onClick={()=>desk.moveSubject(subject,-1,suggestedSubjects)}><ArrowUp size={14}/></button>
              <button title={"Move "+subject+" down"} aria-label={"Move "+subject+" down"} type="button" disabled={index===subjectOrder.length-1}
                onClick={()=>desk.moveSubject(subject,1,suggestedSubjects)}><ArrowDown size={14}/></button>
              {desk.orderedIdsBySubject[subject]?.length > 0 && <button title={"Restore suggested order for "+subject} aria-label={"Restore suggested order for "+subject} type="button" onClick={()=>desk.resetIdeaOrder(subject)}><RotateCcw size={13}/></button>}
            </div>
            {!isCollapsed && <div className="pd-subject-items">
              {list.map((idea,i)=><div className="pd-idea" key={idea.id}>
                <button type="button" className="pd-idea-review" onClick={()=>setReviewId(reviewId===idea.id?null:idea.id)}
                  aria-expanded={reviewId===idea.id}>
                  <BookmarkCheck size={14}/><span>{idea.title}</span><ChevronRight size={14}/>
                </button>
                <div className="pd-idea-tools">
                  <button type="button" title={"Move "+idea.title+" up"} aria-label={"Move "+idea.title+" up"}
                    disabled={i===0} onClick={()=>desk.moveIdea(subject,idea.id,-1,list.map(x=>x.id))}><ArrowUp size={13}/></button>
                  <button type="button" title={"Move "+idea.title+" down"} aria-label={"Move "+idea.title+" down"}
                    disabled={i===list.length-1} onClick={()=>desk.moveIdea(subject,idea.id,1,list.map(x=>x.id))}><ArrowDown size={13}/></button>
                  <button type="button" title={"Remove "+idea.title+" from Think Tank"}
                    aria-label={"Remove "+idea.title+" from Think Tank"} onClick={()=>desk.removeIdea(idea.id)}><X size={13}/></button>
                </div>
                {selectedReview?.id===idea.id && <div className="pd-review">
                  <span className="pd-review-type">{idea.type==="Topic"?"Individual topic":idea.type==="Combined Course"?"Combined course":"Course"}</span>
                  <p>{idea.description || "No additional course description has been supplied yet."}</p>
                  {idea.tips && <p className="pd-review-tip">{idea.tips}</p>}
                  <Link href="/books">Open Book List (preview) <BookOpen size={13}/></Link>
                  <p className="pd-review-note">Student assignments and book preparation will be connected in the next planning phase.</p>
                </div>}
              </div>)}
            </div>}
          </section>;
        })}
      </div> : <p className="pd-empty">Your Think Tank is empty. Use the bookmark beside a course or topic to save it here.</p>}
      <div className="pd-actions">
        {desk.subjectOrder.length > 0 && <button type="button" onClick={desk.resetSubjectOrder}><RotateCcw size={13}/> Restore subject order</button>}
        <span>Saved only in this browser for the preview.</span>
      </div>
      <label className="pd-notes-label" htmlFor="pd-notes">Notes and ideas</label>
      <textarea id="pd-notes" value={desk.notes} onChange={e=>desk.setNotes(e.target.value)}
        rows={3} placeholder="What are you considering?" />
    </> : <div className="pd-plan-empty">
      <ClipboardList size={22}/>
      <h3>My Plan</h3>
      <p>Your assigned courses and topics will appear here after we build shared student and household planning.</p>
      <p>For now, bookmark possibilities in the Think Tank without committing to a student.</p>
      <button type="button" onClick={()=>desk.setTab("think")}>Return to Think Tank</button>
    </div>}
  </aside>;
}
