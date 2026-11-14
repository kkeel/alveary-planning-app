"use client";

import { createContext, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { CountryFilter } from "../courses/country-filter.mjs";

type PlanningDeskState = {
  thinkTankIds: string[];
  // Parent course ID → child edition plan IDs excluded from that course only.
  excludedTopicIdsByCourse: Record<string, string[]>;
  subjectOrder: string[];
  orderedIdsBySubject: Record<string, string[]>;
  collapsedSubjects: string[];
  quiet: boolean;
  tab: "think" | "plan";
  courseMode: "browse" | "plan";
  grades: number[];
  country: CountryFilter;
  notes: string;
};
type PlanningDeskContextValue = PlanningDeskState & {
  ready: boolean;
  setCourseMode: (mode: "browse" | "plan") => void;
  setGrades: Dispatch<SetStateAction<number[]>>;
  setCountry: (country: CountryFilter) => void;
  toggleIdea: (id: string) => void;
  removeIdea: (id: string) => void;
  toggleCourseTopic: (courseId: string, topicId: string, includedTopicIds: string[]) => void;
  restoreCourseTopics: (courseId: string) => void;
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
  thinkTankIds: [], excludedTopicIdsByCourse: {}, subjectOrder: [], orderedIdsBySubject: {},
  collapsedSubjects: [], quiet: false, tab: "think", courseMode: "browse",
  grades: [], country: "all", notes: "",
};
// Keep user-view preferences valid even if old or manually edited local storage is malformed.
function normalizeGrades(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((grade): grade is number =>
    typeof grade === "number" && Number.isInteger(grade) && grade >= 1 && grade <= 12
  ))].sort((a, b) => a - b);
}

function normalizeExcludedTopics(input: unknown): Record<string, string[]> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const result: Record<string, string[]> = {};
  for (const [courseId, ids] of Object.entries(input)) {
    if (courseId === "__proto__" || courseId === "constructor" || courseId === "prototype") continue;
    if (!Array.isArray(ids)) continue;
    const validIds = [...new Set(ids.filter((id): id is string =>
      typeof id === "string" && id.length > 0))];
    if (validIds.length) result[courseId] = validIds;
  }
  return result;
}

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
          excludedTopicIdsByCourse: normalizeExcludedTopics(saved.excludedTopicIdsByCourse),
          subjectOrder: Array.isArray(saved.subjectOrder) ? saved.subjectOrder.filter((x): x is string => typeof x === "string") : [],
          orderedIdsBySubject: saved.orderedIdsBySubject && typeof saved.orderedIdsBySubject === "object" ? saved.orderedIdsBySubject : {},
          collapsedSubjects: Array.isArray(saved.collapsedSubjects) ? saved.collapsedSubjects : [],
          quiet: saved.quiet === true, tab: saved.tab === "plan" ? "plan" : "think",
          courseMode: saved.courseMode === "plan" || (!saved.courseMode && Array.isArray(saved.thinkTankIds) && saved.thinkTankIds.length > 0) ? "plan" : "browse",
          grades: normalizeGrades(saved.grades),
          country: saved.country === "us" || saved.country === "canada" ? saved.country : "all",
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
    setGrades: next => setValue(v => ({
      ...v, grades: normalizeGrades(typeof next === "function" ? next(v.grades) : next),
    })),
    setCountry: country => setValue(v => v.country === country ? v : { ...v, country }),
    toggleIdea: id => setValue(v => {
      const bookmarked = v.thinkTankIds.includes(id);
      const exclusions = { ...v.excludedTopicIdsByCourse };
      // Removing a course clears only that course's draft customization.
      // Re-saving it once again starts with all published topics included.
      if (bookmarked) delete exclusions[id];
      return {
        ...v,
        thinkTankIds: bookmarked ? v.thinkTankIds.filter(x => x !== id) : [...v.thinkTankIds, id],
        excludedTopicIdsByCourse: exclusions,
      };
    }),
    removeIdea: id => setValue(v => {
      const exclusions = { ...v.excludedTopicIdsByCourse };
      delete exclusions[id];
      return { ...v, thinkTankIds: v.thinkTankIds.filter(x => x !== id),
        excludedTopicIdsByCourse: exclusions };
    }),
    toggleCourseTopic: (courseId, topicId, includedTopicIds) => setValue(v => {
      // Only change connected topic editions for an actually saved parent.
      if (!v.thinkTankIds.includes(courseId) || !includedTopicIds.includes(topicId)) return v;
      const current = v.excludedTopicIdsByCourse[courseId] ?? [];
      const next = current.includes(topicId)
        ? current.filter(id => id !== topicId)
        : [...current, topicId];
      const exclusions = { ...v.excludedTopicIdsByCourse };
      if (next.length) exclusions[courseId] = next;
      else delete exclusions[courseId];
      return { ...v, excludedTopicIdsByCourse: exclusions };
    }),
    restoreCourseTopics: courseId => setValue(v => {
      if (!v.thinkTankIds.includes(courseId) || !v.excludedTopicIdsByCourse[courseId]) return v;
      const exclusions = { ...v.excludedTopicIdsByCourse };
      delete exclusions[courseId];
      return { ...v, excludedTopicIdsByCourse: exclusions };
    }),
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
