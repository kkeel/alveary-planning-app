"use client";

import { ArrowLeft, BookOpen } from "lucide-react";
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
      <h1>Your Planning Companion</h1>
      <p className="lead">A little guidance whenever you want it. Explore ideas here, or head straight into your planning tools.</p>
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
  </div>;
}
