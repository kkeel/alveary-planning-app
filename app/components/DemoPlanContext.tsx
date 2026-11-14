"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePlannerAuth } from "./PlannerAuthProvider";

export type SavedTopic = { topicId: string; topicEditionId: string; included: boolean; order: number };
export type SavedOverride = { topicId: string; studentId: string; assigned: boolean };
export type SavedCourse = {
  courseId: string; stage: "idea" | "planned";
  topics: SavedTopic[]; studentIds: string[]; overrides: SavedOverride[];
};
export type PlanningStudent = { id: string; displayName: string; gradeLevel: number | null };
export type DemoPlanSnapshot = {
  schoolYear: "2027-28"; planKind: "demo";
  students: PlanningStudent[]; courses: SavedCourse[];
};
export type LegacyIdea = { courseId: string; excludedTopicIds: string[] };
type Action = "load" | "import" | "set_choice" | "remove_choice" | "set_stage" |
  "set_topic" | "set_course_student" | "set_topic_student";
type DemoPlanContextValue = {
  ready: boolean; saving: boolean; error: string | null;
  courses: SavedCourse[]; students: PlanningStudent[];
  importIdeas: (ideas: LegacyIdea[]) => Promise<void>;
  addChoice: (courseId: string) => void;
  removeChoice: (courseId: string) => void;
  setStage: (courseId: string, stage: "idea" | "planned") => void;
  setTopic: (courseId: string, topicId: string, included: boolean) => void;
  assignCourse: (courseId: string, studentId: string, assigned: boolean) => void;
  assignTopic: (courseId: string, topicId: string, studentId: string, assigned: boolean) => void;
  refresh: () => Promise<void>;
};
const Context = createContext<DemoPlanContextValue | null>(null);
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

function isSnapshot(value: unknown): value is DemoPlanSnapshot {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Partial<DemoPlanSnapshot>;
  return v.schoolYear === "2027-28" && v.planKind === "demo" &&
    Array.isArray(v.students) && Array.isArray(v.courses) &&
    v.courses.every(c => typeof c.courseId === "string" &&
      (c.stage === "idea" || c.stage === "planned") &&
      Array.isArray(c.topics) && Array.isArray(c.studentIds) &&
      Array.isArray(c.overrides));
}
const blank: DemoPlanSnapshot = { schoolYear: "2027-28", planKind: "demo", students: [], courses: [] };

export function DemoPlanProvider({ children }: { children: ReactNode }) {
  const { status, userId, getAccessToken } = usePlannerAuth();
  const [snapshot, setSnapshot] = useState<DemoPlanSnapshot>(blank);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const latestConfirmed = useRef<DemoPlanSnapshot>(blank);
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const pending = useRef(0);
  const enabled = useRef(false);

  const request = useCallback(async (action: Action, fields: object = {}): Promise<DemoPlanSnapshot> => {
    if (!url || !key) throw new Error("not_configured");
    const token = await getAccessToken();
    if (!token) throw new Error("not_signed_in");
    const response = await fetch(url + "/functions/v1/demo-course-planning", {
      method: "POST", cache: "no-store", credentials: "omit",
      headers: { "Authorization": "Bearer " + token, "apikey": key,
        "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...fields }),
    });
    if (!response.ok) throw new Error(response.status === 403 ? "no_demo_access" : "request_failed");
    const data: unknown = await response.json();
    if (!isSnapshot(data)) throw new Error("invalid_response");
    return data;
  }, [getAccessToken]);

  useEffect(() => {
    if (status !== "signed-in" || !userId) {
      enabled.current = false;
      setSnapshot(blank);
      latestConfirmed.current = blank;
      setReady(false);
      setError(null);
      return;
    }
    enabled.current = true;
    let active = true;
    setReady(false);
    void request("load").then(data => {
      if (!active || !enabled.current) return;
      latestConfirmed.current = data;
      setSnapshot(data);
      setReady(true);
    }).catch(() => {
      if (!active) return;
      setReady(false);
      setError("Your saved Demo plan couldn't be loaded. Your browser ideas are still safe.");
    });
    return () => { active = false; };
  }, [request, status, userId]);

  const refresh = useCallback(async () => {
    if (!enabled.current || !ready) return;
    try {
      const data = await request("load");
      if (!enabled.current) return;
      latestConfirmed.current = data;
      if (pending.current === 0) setSnapshot(data);
      setError(null);
    } catch {
      setError("We couldn't refresh your saved plan. Previously confirmed choices remain visible.");
    }
  }, [ready, request]);

  const mutate = useCallback((action: Action, fields: object,
    optimistic?: (current: DemoPlanSnapshot) => DemoPlanSnapshot): Promise<void> => {
    if (!enabled.current || !ready) {
      setError("Your plan is still connecting. Please try again when it is ready.");
      return Promise.resolve();
    }
    if (optimistic) setSnapshot(v => optimistic(v));
    setError(null);
    pending.current += 1;
    setSaving(true);
    const work = chain.current.catch(() => undefined).then(() => request(action, fields));
    chain.current = work;
    return work.then(data => {
      if (!enabled.current) return;
      latestConfirmed.current = data;
      pending.current -= 1;
      if (pending.current === 0) {
        setSnapshot(data);
        setSaving(false);
      }
    }).catch(() => {
      if (!enabled.current) return;
      pending.current -= 1;
      // Failed writes never enter the confirmed snapshot. A later operation
      // may still be queued; its successful response will restore consistency.
      if (pending.current === 0) {
        setSnapshot(latestConfirmed.current);
        setSaving(false);
      }
      setError("One change couldn't be saved. The server's last confirmed plan is shown.");
    });
  }, [ready, request]);

  const importIdeas = useCallback((ideas: LegacyIdea[]) =>
    mutate("import", { ideas: ideas.slice(0, 250) }, current => current), [mutate]);
  const addChoice = useCallback((courseId: string) => {
    void mutate("set_choice", { courseId, stage: "idea" }, current =>
      current.courses.some(c => c.courseId === courseId) ? current : {
        ...current, courses: [...current.courses,
          { courseId, stage: "idea", topics: [], studentIds: [], overrides: [] }],
      });
  }, [mutate]);
  const removeChoice = useCallback((courseId: string) => {
    void mutate("remove_choice", { courseId }, current => ({
      ...current, courses: current.courses.filter(c => c.courseId !== courseId),
    }));
  }, [mutate]);
  const setStage = useCallback((courseId: string, stage: "idea" | "planned") => {
    // If the course is still an unsynced legacy bookmark, establish the
    // choice first; mutations are serialized in click order.
    if (!snapshot.courses.some(c => c.courseId === courseId)) addChoice(courseId);
    void mutate("set_stage", { courseId, stage }, current => ({
      ...current, courses: current.courses.map(c => c.courseId === courseId ? { ...c, stage } : c),
    }));
  }, [snapshot.courses, addChoice, mutate]);
  const setTopic = useCallback((courseId: string, topicId: string, include: boolean) => {
    void mutate("set_topic", { courseId, topicId, include }, current => ({
      ...current, courses: current.courses.map(c => c.courseId !== courseId ? c : {
        ...c, topics: c.topics.map(t => t.topicId === topicId ? { ...t, included: include } : t),
      }),
    }));
  }, [mutate]);
  const assignCourse = useCallback((courseId: string, studentId: string, assign: boolean) => {
    void mutate("set_course_student", { courseId, studentId, assign }, current => ({
      ...current, courses: current.courses.map(c => c.courseId !== courseId ? c : {
        ...c, stage: assign ? "planned" : c.stage,
        studentIds: assign ? [...new Set([...c.studentIds, studentId])] :
          c.studentIds.filter(id => id !== studentId),
        overrides: c.overrides.filter(x => x.studentId !== studentId),
      }),
    }));
  }, [mutate]);
  const assignTopic = useCallback((courseId: string, topicId: string, studentId: string, assign: boolean) => {
    void mutate("set_topic_student", { courseId, topicId, studentId, assign }, current => ({
      ...current, courses: current.courses.map(c => c.courseId !== courseId ? c : {
        ...c, stage: assign ? "planned" : c.stage,
        overrides: [...c.overrides.filter(o => o.topicId !== topicId || o.studentId !== studentId),
          { topicId, studentId, assigned: assign }],
      }),
    }));
  }, [mutate]);

  return <Context.Provider value={{
    ready, saving, error, courses: snapshot.courses, students: snapshot.students,
    importIdeas, addChoice, removeChoice, setStage, setTopic, assignCourse, assignTopic, refresh,
  }}>{children}</Context.Provider>;
}
export function useDemoPlan(): DemoPlanContextValue {
  const result = useContext(Context);
  if (!result) throw new Error("DemoPlanProvider is missing");
  return result;
}
