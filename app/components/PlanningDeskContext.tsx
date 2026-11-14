"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type PlanningDeskState = {
  thinkTankIds: string[];
  subjectOrder: string[];
  orderedIdsBySubject: Record<string, string[]>;
  collapsedSubjects: string[];
  quiet: boolean;
  tab: "think" | "plan";
  courseMode: "browse" | "plan";
  notes: string;
};
type PlanningDeskContextValue = PlanningDeskState & {
  ready: boolean;
  setCourseMode: (mode: "browse" | "plan") => void;
  toggleIdea: (id: string) => void;
  removeIdea: (id: string) => void;
  setQuiet: (quiet: boolean) => void;
  setTab: (tab: "think" | "plan") => void;
  setNotes: (notes: string) => void;
  toggleSubject: (subject: string) => void;
  moveSubject: (subject: string, direction: -1 | 1, suggestedSubjects: string[]) => void;
  moveIdea: (subject: string, id: string, direction: -1 | 1, visibleIds: string[]) => void;
  resetSubjectOrder: () => void;
  resetIdeaOrder: (subject: string) => void;
};

const key = "alveary:shared-planning-desk-preview:2027-28";
const legacyKey = "alveary:course-explorer-preview:2027-28";
const defaults: PlanningDeskState = {
  thinkTankIds: [], subjectOrder: [], orderedIdsBySubject: {},
  collapsedSubjects: [], quiet: false, tab: "think", courseMode: "browse", notes: "",
};
const PlanningDeskContext = createContext<PlanningDeskContextValue | null>(null);

/** The preview stores personal ideas only on this browser. Do not treat this
 * as a household plan or allow it to unlock member-only data or actions. */
export function PlanningDeskProvider({ children }: { children: ReactNode }) {
  const [value, setValue] = useState<PlanningDeskState>(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PlanningDeskState>;
        setValue({
          thinkTankIds: Array.isArray(saved.thinkTankIds) ? saved.thinkTankIds.filter((x): x is string => typeof x === "string") : [],
          subjectOrder: Array.isArray(saved.subjectOrder) ? saved.subjectOrder.filter((x): x is string => typeof x === "string") : [],
          orderedIdsBySubject: saved.orderedIdsBySubject && typeof saved.orderedIdsBySubject === "object" ? saved.orderedIdsBySubject : {},
          collapsedSubjects: Array.isArray(saved.collapsedSubjects) ? saved.collapsedSubjects : [],
          quiet: saved.quiet === true, tab: saved.tab === "plan" ? "plan" : "think",
          courseMode: saved.courseMode === "plan" || (!saved.courseMode && Array.isArray(saved.thinkTankIds) && saved.thinkTankIds.length > 0) ? "plan" : "browse",
          notes: typeof saved.notes === "string" ? saved.notes : "",
        });
      } else {
        // Preserve earlier prototype bookmarks; no student assignments existed.
        const legacy = JSON.parse(window.localStorage.getItem(legacyKey) || "{}") as {planned?: unknown;notes?:unknown};
        setValue(prev => ({
          ...prev,
          thinkTankIds: Array.isArray(legacy.planned) ? legacy.planned.filter((x): x is string => typeof x === "string") : [],
          notes: typeof legacy.notes === "string" ? legacy.notes : "",
          courseMode: Array.isArray(legacy.planned) && legacy.planned.length > 0 ? "plan" : "browse",
        }));
      }
    } catch {
      // A corrupt local preview must not block publicly browsable pages.
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* storage is optional for a public-safe UI preview */ }
  }, [value, ready]);

  const api = useMemo<PlanningDeskContextValue>(() => ({
    ...value, ready,
    setCourseMode: courseMode => setValue(v => v.courseMode === courseMode ? v : { ...v, courseMode }),
    toggleIdea: id => setValue(v => ({
      ...v, thinkTankIds: v.thinkTankIds.includes(id)
        ? v.thinkTankIds.filter(x => x !== id) : [...v.thinkTankIds, id],
    })),
    removeIdea: id => setValue(v => ({ ...v, thinkTankIds: v.thinkTankIds.filter(x => x !== id) })),
    setQuiet: quiet => setValue(v => ({ ...v, quiet })),
    setTab: tab => setValue(v => ({ ...v, tab })),
    setNotes: notes => setValue(v => ({ ...v, notes })),
    toggleSubject: subject => setValue(v => ({
      ...v,
      collapsedSubjects: v.collapsedSubjects.includes(subject)
        ? v.collapsedSubjects.filter(x => x !== subject)
        : [...v.collapsedSubjects, subject],
    })),
    moveSubject: (subject, direction, suggestedSubjects) => setValue(v => {
      // First customization respects the suggested order, not recently-added order.
      const normalized = v.subjectOrder.length
        ? [...v.subjectOrder.filter(x=>suggestedSubjects.includes(x)), ...suggestedSubjects.filter(x=>!v.subjectOrder.includes(x))]
        : [...suggestedSubjects];
      const index = normalized.indexOf(subject), next = index + direction;
      if (!normalized.includes(subject) || next < 0 || next >= normalized.length) return v;
      [normalized[index], normalized[next]] = [normalized[next], normalized[index]];
      return { ...v, subjectOrder: normalized };
    }),
    moveIdea: (subject, id, direction, visibleIds) => setValue(v => {
      const previous = v.orderedIdsBySubject[subject] ?? [];
      const order = previous.length
        ? [...previous.filter(x=>visibleIds.includes(x)), ...visibleIds.filter(x=>!previous.includes(x))]
        : [...visibleIds];
      const index = order.indexOf(id), next = index + direction;
      if (index < 0 || next < 0 || next >= order.length) return v;
      [order[index], order[next]] = [order[next], order[index]];
      return { ...v, orderedIdsBySubject: { ...v.orderedIdsBySubject, [subject]: order } };
    }),
    resetSubjectOrder: () => setValue(v => ({ ...v, subjectOrder: [] })),
    resetIdeaOrder: subject => setValue(v => {
      const ordered = { ...v.orderedIdsBySubject };
      delete ordered[subject];
      return { ...v, orderedIdsBySubject: ordered };
    }),
  }), [value, ready]);

  return <PlanningDeskContext.Provider value={api}>{children}</PlanningDeskContext.Provider>;
}

export function usePlanningDesk(): PlanningDeskContextValue {
  const value = useContext(PlanningDeskContext);
  if (!value) throw new Error("PlanningDeskProvider is missing from AppShell");
  return value;
}
