"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type { CountryFilter } from "../courses/country-filter.mjs";
import type { DetailMode as CourseDetailMode } from "./DetailViewSwitch";
import { useDemoPlan } from "./DemoPlanContext";

type DetailMode = CourseDetailMode;
type PlanningDeskState = {
  listDetails: CourseDetailMode;
  thinkDetails: DetailMode;
  planDetails: DetailMode;
  thinkTankIds: string[];
  // Parent course ID → child edition plan IDs excluded from that course only.
  excludedTopicIdsByCourse: Record<string, string[]>;
  subjectOrder: string[];
  orderedIdsBySubject: Record<string, string[]>;
  collapsedSubjects: string[];
  quiet: boolean;
  tab: "think" | "plan";
  // Distinguishes a member's deliberate tab choice from the old Think Tank fallback.
  tabExplicit: boolean;
  courseMode: "browse" | "plan";
  grades: number[];
  country: CountryFilter;
  subjectFilter: string;
  courseSearch: string;
  notes: string;
};
type PlanningDeskContextValue = PlanningDeskState & {
  ready: boolean;
  setCourseMode: (mode: "browse" | "plan") => void;
  setListDetails: (mode: CourseDetailMode) => void;
  setThinkDetails: (mode: DetailMode) => void;
  setPlanDetails: (mode: DetailMode) => void;
  setGrades: Dispatch<SetStateAction<number[]>>;
  setCountry: (country: CountryFilter) => void;
  setSubjectFilter: (subject: string) => void;
  setCourseSearch: (query: string) => void;
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

const keyPrefix = "alveary:shared-planning-desk-preview:2027-28:";
const defaults: PlanningDeskState = {
  // Expanded shows the curriculum structure without overwhelming new members.
  listDetails: "topics", thinkDetails: "topics", planDetails: "topics",
  thinkTankIds: [], excludedTopicIdsByCourse: {}, subjectOrder: [], orderedIdsBySubject: {},
  collapsedSubjects: [], quiet: false, tab: "plan", tabExplicit: false, courseMode: "browse",
  grades: [], country: "all", subjectFilter: "", courseSearch: "", notes: "",
};
// Keep user-view preferences valid even if old or manually edited local storage is malformed.
function normalizeGrades(input: unknown): number[] {
  if (!Array.isArray(input)) return [];
  return [...new Set(input.filter((grade): grade is number =>
    typeof grade === "number" && Number.isInteger(grade) && grade >= 1 && grade <= 12
  ))].sort((a, b) => a - b);
}

function normalizeFilterText(input: unknown, maxLength: number): string {
  return typeof input === "string" && input.length <= maxLength ? input : "";
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
export function PlanningDeskProvider({ children, storageScope }: { children: ReactNode; storageScope: string }) {
  const cloud = useDemoPlan();
  const storageKey = keyPrefix + storageScope;
  const [value, setValue] = useState<PlanningDeskState>(defaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = storageScope === "public" ? null : window.localStorage.getItem(storageKey);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<PlanningDeskState>;
        setValue({
          // Older saved "expanded" showed every description: migrate it to
          // Detailed. The new Expanded (topics-only) persists as "topics".
          listDetails: saved.listDetails === "compact" ? "compact" :
            saved.listDetails === "topics" ? "topics" : "detailed",
          // Previously "expanded" meant one open course. Preserve the user\'s
          // preference as the new topics-only Expanded, while honoring compact.
          thinkDetails: saved.thinkDetails === "detailed" ? "detailed" :
            saved.thinkDetails === "compact" ? "compact" : "topics",
          planDetails: saved.planDetails === "detailed" ? "detailed" :
            saved.planDetails === "compact" ? "compact" : "topics",
          thinkTankIds: Array.isArray(saved.thinkTankIds) ? saved.thinkTankIds.filter((x): x is string => typeof x === "string") : [],
          excludedTopicIdsByCourse: normalizeExcludedTopics(saved.excludedTopicIdsByCourse),
          subjectOrder: Array.isArray(saved.subjectOrder) ? saved.subjectOrder.filter((x): x is string => typeof x === "string") : [],
          orderedIdsBySubject: saved.orderedIdsBySubject && typeof saved.orderedIdsBySubject === "object" ? saved.orderedIdsBySubject : {},
          collapsedSubjects: Array.isArray(saved.collapsedSubjects) ? saved.collapsedSubjects : [],
          quiet: saved.quiet === true,
          // Older stored "think" was also the automatic default, so it did
          // not necessarily indicate a member had chosen it. Migrate those
          // sessions to My Plan once, then respect every deliberate tab click.
          tab: saved.tabExplicit === true && saved.tab === "think" ? "think" : "plan",
          tabExplicit: saved.tabExplicit === true,
          // A prior explicit Planning selection wins. Existing Think Tank ideas
          // alone should not force a first-time member into full-page Planning.
          courseMode: saved.courseMode === "plan" ? "plan" : "browse",
          grades: normalizeGrades(saved.grades),
          country: saved.country === "us" || saved.country === "canada" ? saved.country : "all",
          subjectFilter: normalizeFilterText(saved.subjectFilter, 100),
          courseSearch: normalizeFilterText(saved.courseSearch, 500),
          notes: typeof saved.notes === "string" ? saved.notes : "",
        });
      }
    } catch {
      // A corrupt local preview must not block publicly browsable pages.
    }
    setReady(true);
  }, [storageKey, storageScope]);

  useEffect(() => {
    if (!ready || storageScope === "public") return;
    try { window.localStorage.setItem(storageKey, JSON.stringify(value)); }
    catch { /* storage is optional for a public-safe UI preview */ }
  }, [value, ready, storageKey, storageScope]);

  // The older local-only bookmark model is no longer the source of truth.
  // Never mirror cloud courses into thinkTankIds: a legacy cleanup path used
  // to mistake those IDs for stale bookmarks and DELETE real saved courses.
  // Clear only browser-local bookmark/exclusion data, without sending any
  // planning mutations. The authenticated Demo plan remains untouched.
  useEffect(() => {
    if (!ready || storageScope === "public" || !cloud.ready) return;
    setValue(previous => {
      if (!previous.thinkTankIds.length &&
          !Object.keys(previous.excludedTopicIdsByCourse).length) return previous;
      return { ...previous, thinkTankIds: [], excludedTopicIdsByCourse: {} };
    });
  }, [ready, storageScope, cloud.ready]);

  // Keep this action stable across state updates so auth initialization never
  // re-runs merely because a member clicks List | Planning.
  const setCourseMode = useCallback((mode: "browse" | "plan") => {
    setValue(previous => previous.courseMode === mode ? previous : { ...previous, courseMode: mode });
  }, []);

  const api = useMemo<PlanningDeskContextValue>(() => ({
    ...value, ready,
    setCourseMode,
    setListDetails: mode => setValue(v => v.listDetails === mode ? v : {...v,listDetails:mode}),
    setThinkDetails: mode => setValue(v => v.thinkDetails === mode ? v : {...v,thinkDetails:mode}),
    setPlanDetails: mode => setValue(v => v.planDetails === mode ? v : {...v,planDetails:mode}),
    setGrades: next => setValue(v => ({
      ...v, grades: normalizeGrades(typeof next === "function" ? next(v.grades) : next),
    })),
    setCountry: country => setValue(v => v.country === country ? v : { ...v, country }),
    setSubjectFilter: subject => setValue(v => v.subjectFilter === subject ? v :
      { ...v, subjectFilter: normalizeFilterText(subject, 100) }),
    setCourseSearch: query => setValue(v => v.courseSearch === query ? v :
      { ...v, courseSearch: normalizeFilterText(query, 500) }),
    toggleIdea: id => {
      const exists = value.thinkTankIds.includes(id);
      const saved = cloud.courses.find(c => c.courseId === id);
      if (exists && saved?.stage === "planned" &&
          !window.confirm("Remove this course from My Plan and its student topic assignments? This cannot be undone.")) {
        return;
      }
      if (cloud.ready) {
        if (exists && cloud.courses.some(c => c.courseId === id)) cloud.removeChoice(id);
        else if (!exists) cloud.addChoice(id);
      }
      setValue(v => {
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
      });
    },
    removeIdea: id => {
      if (cloud.ready && cloud.courses.some(c => c.courseId === id)) cloud.removeChoice(id);
      setValue(v => {
      const exclusions = { ...v.excludedTopicIdsByCourse };
      delete exclusions[id];
      return { ...v, thinkTankIds: v.thinkTankIds.filter(x => x !== id),
        excludedTopicIdsByCourse: exclusions };
      });
    },
    toggleCourseTopic: (courseId, topicId, includedTopicIds) => {
      if (cloud.ready && cloud.courses.some(c => c.courseId === courseId)) {
        const nowExcluded = (value.excludedTopicIdsByCourse[courseId] ?? []).includes(topicId);
        cloud.setTopic(courseId, topicId, nowExcluded);
      }
      setValue(v => {
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
      });
    },
    restoreCourseTopics: courseId => {
      if (cloud.ready && cloud.courses.some(c => c.courseId === courseId)) {
        for (const topicId of value.excludedTopicIdsByCourse[courseId] ?? []) {
          cloud.setTopic(courseId, topicId, true);
        }
      }
      setValue(v => {
      if (!v.thinkTankIds.includes(courseId) || !v.excludedTopicIdsByCourse[courseId]) return v;
      const exclusions = { ...v.excludedTopicIdsByCourse };
      delete exclusions[courseId];
      return { ...v, excludedTopicIdsByCourse: exclusions };
      });
    },
    setQuiet: quiet => setValue(v => ({ ...v, quiet })),
    setTab: tab => setValue(v => v.tab === tab && v.tabExplicit ? v : {
      ...v, tab, tabExplicit: true,
    }),
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
  }), [value, ready, cloud, setCourseMode]);

  return <PlanningDeskContext.Provider value={api}>{children}</PlanningDeskContext.Provider>;
}

export function usePlanningDesk(): PlanningDeskContextValue {
  const value = useContext(PlanningDeskContext);
  if (!value) throw new Error("PlanningDeskProvider is missing from AppShell");
  return value;
}
