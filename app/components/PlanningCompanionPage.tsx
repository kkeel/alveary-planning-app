"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlanningCompanion } from "./PlanningCompanionContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import { CompanionPlanYear, CompanionPriorities, CompanionWelcome } from "./PlanningCompanionGuide";
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
  function openScheduling() {
    companion.minimize();
    router.push("/scheduling");
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
        onContinue={continueMyPlan}
        onPlanYear={() => companion.chooseSection("plan/year")}/>
        : <>
          <button type="button" className="pc-back" onClick={() => companion.chooseSection("welcome")}>
            <ArrowLeft size={14} aria-hidden="true"/> Companion home
          </button>
          <div className="pc-workspace-guide-heading">
            <h2>{companion.section === "plan/year" ? "Plan your year" : "Choosing your priorities"}</h2>
          </div>
          {companion.section === "plan/year"
            ? <CompanionPlanYear onOpenPlan={continueMyPlan} onOpenSchedule={openScheduling}/>
            : <CompanionPriorities onBrowse={browseWithGuidance}/>}
        </>}
    </div>
  </div>;
}
