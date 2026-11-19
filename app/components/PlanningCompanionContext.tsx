"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useDemoPlan } from "./DemoPlanContext";

export type CompanionSection = "welcome" | "priorities/core" | "priorities/interest" | "priorities/additional";
export type CompanionVisibility = "open" | "minimized" | "closed";

type CompanionState = {
  section: CompanionSection;
  visibility: CompanionVisibility;
  tipPending: boolean;
  tipOpen: boolean;
  firstChoiceTipSeen: boolean;
};
type CompanionContextValue = CompanionState & {
  ready: boolean;
  chooseSection: (section: CompanionSection) => void;
  openGuide: (section?: CompanionSection) => void;
  openCompanion: () => void;
  minimize: () => void;
  close: () => void;
  dismissTip: () => void;
};

const defaults: CompanionState = {
  section: "welcome", visibility: "minimized",
  tipPending: false, tipOpen: false, firstChoiceTipSeen: false,
};
const sections: CompanionSection[] = [
  "welcome", "priorities/core", "priorities/interest", "priorities/additional",
];
function isSection(value: unknown): value is CompanionSection {
  return typeof value === "string" && sections.includes(value as CompanionSection);
}
function isVisibility(value: unknown): value is CompanionVisibility {
  return value === "open" || value === "minimized" || value === "closed";
}

const PlanningCompanionContext = createContext<CompanionContextValue | null>(null);

/** Browser-scoped, member-isolated guidance state. Never stores curriculum selections. */
export function PlanningCompanionProvider({
  children, storageScope,
}: { children: ReactNode; storageScope: string }) {
  const plan = useDemoPlan();
  const storageKey = "alveary:planning-companion:2027-28:" + storageScope;
  const [state, setState] = useState<CompanionState>(defaults);
  const [ready, setReady] = useState(false);
  const previousCourseCount = useRef<number | null>(null);

  useEffect(() => {
    try {
      const raw = storageScope === "public" ? null : window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<CompanionState>;
        setState({
          section: isSection(saved.section) ? saved.section : "welcome",
          visibility: isVisibility(saved.visibility) ? saved.visibility : "minimized",
          tipPending: saved.tipPending === true,
          tipOpen: false,
          firstChoiceTipSeen: saved.firstChoiceTipSeen === true,
        });
      }
    } catch {
      // A disabled or corrupt browser preference must never block browsing.
    }
    setReady(true);
  }, [storageKey, storageScope]);

  useEffect(() => {
    if (!ready || storageScope === "public") return;
    try {
      // Store small guide preferences only; actual member selections stay in
      // the existing authenticated plan data source.
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch { /* Local storage is optional. */ }
  }, [ready, state, storageKey, storageScope]);

  useEffect(() => {
    if (!ready || !plan.ready || storageScope === "public") return;
    const currentCount = plan.courses.length;
    if (previousCourseCount.current === null) {
      // Establish a baseline AFTER the plan finishes loading. Do not nag a
      // returning member about a selection restored from their previous visit.
      previousCourseCount.current = currentCount;
      return;
    }
    if (previousCourseCount.current === 0 && currentCount > 0) {
      setState(previous => previous.firstChoiceTipSeen || previous.tipPending
        ? previous : { ...previous, tipPending: true });
    }
    previousCourseCount.current = currentCount;
  }, [ready, plan.ready, plan.courses.length, storageScope]);

  const api = useMemo<CompanionContextValue>(() => ({
    ...state, ready,
    chooseSection: section => setState(previous =>
      ({ ...previous, section, tipOpen: false })),
    openGuide: section => setState(previous =>
      ({ ...previous, visibility: "open", section: section ?? previous.section, tipOpen: false })),
    openCompanion: () => setState(previous => previous.tipPending
      ? { ...previous, visibility: "open", tipOpen: true, tipPending: false, firstChoiceTipSeen: true }
      : { ...previous, visibility: "open", tipOpen: false }),
    minimize: () => setState(previous => ({ ...previous, visibility: "minimized", tipOpen: false })),
    close: () => setState(previous => ({ ...previous, visibility: "closed", tipOpen: false })),
    dismissTip: () => setState(previous => ({
      ...previous, tipOpen: false, tipPending: false, firstChoiceTipSeen: true,
    })),
  }), [state, ready]);

  return <PlanningCompanionContext.Provider value={api}>{children}</PlanningCompanionContext.Provider>;
}

export function usePlanningCompanion(): CompanionContextValue {
  const value = useContext(PlanningCompanionContext);
  if (!value) throw new Error("PlanningCompanionProvider is missing");
  return value;
}
