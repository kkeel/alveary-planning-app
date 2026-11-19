"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, Compass, ListChecks, NotebookPen } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlanningCompanion } from "./PlanningCompanionContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import { CompanionPriorities, CompanionWelcome } from "./PlanningCompanionGuide";
import "./planning-companion.css";

export default function PlanningCompanionPage() {
  const companion = usePlanningCompanion();
  const desk = usePlanningDesk();
  const router = useRouter();

  function browseWithGuidance() {
    // "Planning" is the full two-column desk; course browsing intentionally
    // uses the list mode, where the real course/topic buttons live.
    desk.setCourseMode("browse");
    companion.openGuide();
    router.push("/courses");
  }
  function continueMyPlan() {
    desk.setCourseMode("browse");
    desk.setTab("plan");
    desk.setQuiet(false);
    companion.close();
    router.push("/courses");
  }

  return <div className="pc-workspace">
    <div className="pc-workspace-heading">
      <div className="pc-heading-top">
        <span><Compass size={21} aria-hidden="true"/> ALVEARY PLANNING</span>
        <Link href="/" className="pc-overview-back"><ArrowLeft size={14} aria-hidden="true"/> Planning Overview</Link>
      </div>
      <h1>Your Planning Companion</h1>
      <p>A little guidance whenever you want it. Explore ideas here, or head straight into your planning tools.</p>
    </div>
    <div className="pc-workspace-card">
      {companion.section === "welcome" ? <CompanionWelcome
        onHelp={() => companion.chooseSection("priorities/core")}
        onContinue={continueMyPlan}/>
        : <>
          <button type="button" className="pc-back" onClick={() => companion.chooseSection("welcome")}>
            <ArrowLeft size={14} aria-hidden="true"/> Companion home
          </button>
          <div className="pc-workspace-guide-heading">
            <BookOpen size={18} aria-hidden="true"/>
            <div><h2>Choosing your priorities</h2>
              <p>There are many wonderful things to learn. You don't have to fit them all into one year.</p></div>
          </div>
          <CompanionPriorities onBrowse={browseWithGuidance}/>
        </>}
    </div>
    <div className="pc-workspace-next">
      <div><ListChecks size={17} aria-hidden="true"/>
        <span><strong>Already know what you want?</strong> The guide is optional. You can always return here later.</span></div>
      <Link href="/courses" onClick={() => {
        desk.setCourseMode("browse");
        desk.setTab("plan");
        if (companion.section === "welcome") companion.minimize();
        else companion.openGuide();
      }}><NotebookPen size={15} aria-hidden="true"/> Go to Course List</Link>
    </div>
  </div>;
}
