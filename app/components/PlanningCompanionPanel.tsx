"use client";

import Link from "next/link";
import { BookOpen, ChevronRight, Compass, Lightbulb, Minimize2, Sparkles, X } from "lucide-react";
import { usePlanningCompanion } from "./PlanningCompanionContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import { CompanionPriorities, CompanionWelcome } from "./PlanningCompanionGuide";
import "./planning-companion.css";

/** Sits above the portable Planning Desk, never over course rows. */
export default function PlanningCompanionPanel() {
  const companion = usePlanningCompanion();
  const desk = usePlanningDesk();
  if (!companion.ready) return null;

  if (companion.visibility === "closed") {
    return <div className="pc-closed">
      <button type="button" onClick={() => companion.openGuide()}
        aria-label="Reopen Planning Companion"><Compass size={15} aria-hidden="true"/>
        Planning help <ChevronRight size={13} aria-hidden="true"/>
      </button>
    </div>;
  }

  if (companion.visibility === "minimized") {
    return <button type="button" className={"pc-minimized" +
      (companion.tipPending ? " has-tip" : "")}
      aria-label={companion.tipPending
        ? "Planning Companion: a new planning tip is available"
        : "Open Planning Companion"}
      onClick={companion.openCompanion}>
      <Compass size={18} aria-hidden="true"/>
      <span className="pc-mini-long">Planning Companion</span>
      <span className="pc-mini-short" aria-hidden="true">Help</span>
      {companion.tipPending
        ? <span className="pc-tip-indicator"><Sparkles size={13} aria-hidden="true"/> Tip available</span>
        : <ChevronRight size={15} aria-hidden="true"/>}
    </button>;
  }

  function goToMyPlan() {
    companion.minimize();
    desk.setCourseMode("browse");
    desk.setTab("plan");
    desk.setQuiet(false);
  }

  return <aside className="pc-panel is-open" aria-label="Planning Companion guidance">
    <header className="pc-panel-header">
      <span><Compass size={17} aria-hidden="true"/> Planning Companion</span>
      <div className="pc-panel-actions">
        <button type="button" title="Minimize the Companion" aria-label="Minimize Planning Companion"
          onClick={companion.minimize}><Minimize2 size={15} aria-hidden="true"/></button>
        <button type="button" title="Close the Companion" aria-label="Close Planning Companion"
          onClick={companion.close}><X size={16} aria-hidden="true"/></button>
      </div>
    </header>
    <div className="pc-panel-body">
      {companion.tipOpen ? <div className="pc-current-tip">
        <span className="pc-eyebrow"><Sparkles size={14} aria-hidden="true"/> A gentle planning tip</span>
        <h3>Start with what you know</h3>
        <p>You can choose a course or topic now and decide whether it's Core, High Interest, or Additional later. Your plan can grow a little at a time.</p>
        <button type="button" onClick={companion.dismissTip}>Back to my guidance</button>
      </div> : companion.section === "welcome"
        ? <CompanionWelcome compact
            onHelp={() => companion.openGuide("priorities/core")}
            onContinue={goToMyPlan}/>
        : <CompanionPriorities compact/>}
    </div>
    <footer className="pc-panel-footer">
      <Link href="/companion"><BookOpen size={14} aria-hidden="true"/>
        Open full guidance</Link>
      <span>Here when you need it.</span>
    </footer>
  </aside>;
}
