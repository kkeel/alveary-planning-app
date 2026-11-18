"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { usePlannerAuth } from "./PlannerAuthProvider";
import { demoteIfNoAssignedTopics, isTopicAssigned } from "./topic-assignment.mjs";
import { nextCourseIdeaAll, isUnusedSavedCourse } from "../courses/list-row-status.mjs";
import catalog from "../courses/catalog-preview.json";
import { previewTopicsForCourse } from "../courses/optimistic-topics.mjs";

export type SavedTopic = {
  topicId:string; topicEditionId:string; included:boolean; order:number;
  ideaChoice:"inherit"|"on"|"off";
};
export type SavedOverride = { topicId: string; studentId: string; assigned: boolean };
export type SavedCourse = {
  courseId: string; stage: "idea" | "planned"; ideaAll:boolean;
  topics: SavedTopic[]; studentIds: string[]; overrides: SavedOverride[];
};
export type PlanningStudent = { id: string; displayName: string; gradeLevel: number | null };
export type PlanningGroup = { id: string; name: string; studentIds: string[] };
export type AssignmentPriority = {
  courseId: string; studentId: string; topicId: string | null;
  priority: "Core" | "High Interest" | "Additional" | "Not set";
};
export type SharedPriority = { courseId: string; topicId: string | null;
  priority: "Core" | "High Interest" | "Additional" | "Not set" };
export type AssignmentArrangement = {
  courseId: string; studentId: string; topicId: string | null;
  arrangement: "Combined" | "Separate" | "Later" | "Both";
};
export type SharedArrangement = {
  courseId: string; topicId: string | null;
  arrangement: "Combined" | "Separate" | "Later";
};
export type StudentPreference = {
  courseId: string; studentId: string;
  priority: "Core" | "High Interest" | "Additional" | null;
  arrangement: "Combined" | "Separate" | "Both" | "Later";
};
export type DemoPlanSnapshot = {
  schoolYear: "2027-28"; planKind: "demo";
  students: PlanningStudent[]; courses: SavedCourse[];
  studentGroups: PlanningGroup[]; studentPreferences: StudentPreference[];
  assignmentPriorities: AssignmentPriority[];
  sharedPriorities: SharedPriority[];
  assignmentArrangements: AssignmentArrangement[];
  sharedArrangements: SharedArrangement[];
};
export type LegacyIdea = { courseId: string; excludedTopicIds: string[] };
type Action = "load" | "import" | "set_choice" | "remove_choice" | "set_stage" |
  "toggle_idea" | "clear_plan" | "prepare_plan" |
  "set_topic" | "set_course_student" | "set_topic_student" |
  "batch_assign" | "set_preference" | "set_assignment_priority" | "set_shared_priority" |
  "set_assignment_arrangement" | "set_shared_arrangement" |
  "upsert_group" | "delete_group";
type DemoPlanContextValue = {
  ready: boolean; saving: boolean; error: string | null;
  courses: SavedCourse[]; students: PlanningStudent[];
  studentGroups: PlanningGroup[]; studentPreferences: StudentPreference[];
  assignmentPriorities: AssignmentPriority[];
  sharedPriorities: SharedPriority[];
  assignmentArrangements: AssignmentArrangement[];
  sharedArrangements: SharedArrangement[];
  importIdeas: (ideas: LegacyIdea[]) => Promise<void>;
  addChoice: (courseId: string) => void;
  toggleListIdea: (courseId:string,topicId:string|null) => void;
  clearListPlan: (courseId:string,topicId:string|null) => void;
  prepareListPlan: (courseId:string,topicId:string|null) => void;
  addStudent: (displayName: string, gradeLevel: number | null) => Promise<boolean>;
  removeChoice: (courseId: string) => void;
  setStage: (courseId: string, stage: "idea" | "planned") => void;
  setTopic: (courseId: string, topicId: string, included: boolean) => void;
  assignCourse: (courseId: string, studentId: string, assigned: boolean) => void;
  assignTopic: (courseId: string, topicId: string, studentId: string, assigned: boolean) => void;
  assignStudents: (courseId: string, studentIds: string[], assigned: boolean) => void;
  setPreference: (courseId: string, studentId: string,
    priority: StudentPreference["priority"], arrangement: StudentPreference["arrangement"]) => void;
  setAssignmentPriority: (courseId: string, studentId: string,
    topicId: string | null, priority: AssignmentPriority["priority"] | null) => void;
  setSharedPriority: (courseId: string, topicId: string | null,
    priority: SharedPriority["priority"] | null) => void;
  setAssignmentArrangement: (courseId: string, studentId: string,
    topicId: string | null, arrangement: "Combined" | "Separate" | "Later" | null) => void;
  setSharedArrangement: (courseId:string,topicId:string|null,
    arrangement:SharedArrangement["arrangement"]|null)=>void;
  saveGroup: (name: string, studentIds: string[], groupId?: string) => Promise<void>;
  deleteGroup: (groupId: string) => Promise<void>;
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
    Array.isArray(v.studentGroups) && Array.isArray(v.studentPreferences) &&
    Array.isArray(v.assignmentPriorities) &&
    Array.isArray(v.sharedPriorities) &&
    Array.isArray(v.assignmentArrangements) &&
    Array.isArray(v.sharedArrangements) &&
    v.courses.every(c => typeof c.courseId === "string" &&
      (c.stage === "idea" || c.stage === "planned") &&
      typeof c.ideaAll === "boolean" &&
      Array.isArray(c.topics) && c.topics.every(t =>
        t.ideaChoice==="inherit"||t.ideaChoice==="on"||t.ideaChoice==="off") && Array.isArray(c.studentIds) &&
      Array.isArray(c.overrides));
}
const blank: DemoPlanSnapshot = { schoolYear: "2027-28", planKind: "demo",
  students: [], courses: [], studentGroups: [], studentPreferences: [],
  assignmentPriorities: [], sharedPriorities: [], assignmentArrangements: [], sharedArrangements: [] };

/** Removing a saved course resets every old per-course customization and
 * exclusion in the optimistic view, matching database cascade deletion. */
function withoutCourse(current:DemoPlanSnapshot,courseId:string):DemoPlanSnapshot {
  return {...current,
    courses:current.courses.filter(x=>x.courseId!==courseId),
    studentPreferences:current.studentPreferences.filter(x=>x.courseId!==courseId),
    assignmentPriorities:current.assignmentPriorities.filter(x=>x.courseId!==courseId),
    sharedPriorities:current.sharedPriorities.filter(x=>x.courseId!==courseId),
    assignmentArrangements:current.assignmentArrangements.filter(x=>x.courseId!==courseId),
    sharedArrangements:current.sharedArrangements.filter(x=>x.courseId!==courseId),
  };
}

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
          { courseId, stage: "idea", ideaAll: true,
             topics: [], studentIds: [], overrides: [] }],
      });
  }, [mutate]);
  /** List controls are reversible per exact saved parent/topic context.
   * The API prepares a missing parent with NO other Think Tank topics when
   * starting at a nested +. No deletion of unrelated parent assignments. */
  const prepareListPlan = useCallback((courseId:string,topicId:string|null) => {
    void mutate("prepare_plan",{courseId,topicId},current =>
      current.courses.some(c=>c.courseId===courseId) ? current : {
        ...current,courses:[...current.courses,
          {courseId,stage:"idea",ideaAll:false,
           topics:[],studentIds:[],overrides:[]}],
      });
  },[mutate]);

  const toggleListIdea = useCallback((courseId:string,topicId:string|null) => {
    // The catalog already knows the parent and all included source topics.
    // Hydrate the optimistic choice BEFORE the API responds so both its
    // button color and the portable Planning Desk update on this click.
    // Confirmation and rollback still come exclusively from mutate().
    void mutate("toggle_idea",{courseId,topicId},current => {
      const existing=current.courses.find(c=>c.courseId===courseId);
      if (!existing) {
        const topics=previewTopicsForCourse(catalog,courseId).map(t=>({
          ...t,ideaChoice:(t.topicId===topicId ? "on" : "inherit") as SavedTopic["ideaChoice"],
        }));
        return {...current,courses:[...current.courses,{
          courseId,stage:"idea",ideaAll:topicId===null,topics,
          studentIds:[],overrides:[],
        }]};
      }
      const courses=current.courses.map(c=>{
        if (c.courseId!==courseId) return c;
        const topics=c.topics.length ? c.topics : previewTopicsForCourse(catalog,courseId);
        if (topicId===null) {
          // A course bulb fills missing Think Tank topics first. It removes
          // the selection only when every eligible topic was already an idea.
          // Student-assigned topics remain in My Plan and are not counted as
          // pending ideas in this parent context.
          const nextAll=nextCourseIdeaAll({...c,topics},current.students);
          return {...c,ideaAll:nextAll,
            topics:topics.map(t=>({...t,ideaChoice:"inherit" as const}))};
        }
        return {...c,topics:topics.map(t=>{
          if (t.topicId!==topicId) return t;
          const selected=t.ideaChoice==="on"||
            (t.ideaChoice==="inherit"&&c.ideaAll);
          const ideaChoice:SavedTopic["ideaChoice"]=selected
            ? c.ideaAll ? "off":"inherit"
            : c.ideaAll ? "inherit":"on";
          return {...t,ideaChoice};
        })};
      });
      const changed=courses.find(c=>c.courseId===courseId);
      const optimistic={...current,courses};
      return changed&&isUnusedSavedCourse(changed,current.students)
        ? withoutCourse(optimistic,courseId):optimistic;
    });
  },[mutate]);

  const clearListPlan = useCallback((courseId:string,topicId:string|null) => {
    void mutate("clear_plan",{courseId,topicId},current => ({
      ...current,courses:current.courses.map(c=>{
        if (c.courseId!==courseId) return c;
        if (topicId===null) return {...c,stage:"idea" as const,ideaAll:true,
          studentIds:[],overrides:[],
          topics:c.topics.map(t=>({...t,ideaChoice:"inherit" as const}))};
        const impacted=current.students.filter(student=>
          isTopicAssigned(c,topicId,student.id));
        const next:SavedCourse={...c,
          topics:c.topics.map(t=>t.topicId===topicId
            ? {...t,ideaChoice:"on" as const}:t),
          overrides:[
            ...c.overrides.filter(o=>o.topicId!==topicId),
            ...impacted.map(student=>({
              topicId,studentId:student.id,assigned:false,
            })),
          ],
        };
        return demoteIfNoAssignedTopics(next,current.students);
      }),
    }));
  },[mutate]);

  // Reuse the SAME secure student API as the Students page. The private
  // planning snapshot is then refreshed in the serialized mutation queue,
  // so both screens immediately agree after the save completes.
  const addStudent = useCallback(async (displayName: string, gradeLevel: number | null): Promise<boolean> => {
    const name = displayName.trim().replace(/\s+/g, " ");
    if (!ready || !enabled.current || !name || name.length > 60 ||
        (gradeLevel !== null && (!Number.isInteger(gradeLevel) || gradeLevel < 0 || gradeLevel > 12))) {
      setError("Choose a name or nickname and an optional grade.");
      return false;
    }
    if (!url || !key) {
      setError("Student saving is not available right now.");
      return false;
    }
    pending.current += 1;
    setSaving(true);
    setError(null);
    const work = chain.current.catch(() => undefined).then(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("not_signed_in");
      const result = await fetch(url + "/functions/v1/demo-students", {
        method: "POST", credentials: "omit", cache: "no-store",
        headers: { Authorization: "Bearer " + token, apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add", displayName: name, gradeLevel }),
      });
      if (!result.ok) throw new Error("student_add_failed");
      const saved: unknown = await result.json();
      if (!saved || typeof saved !== "object" || Array.isArray(saved) ||
          !Array.isArray((saved as { students?: unknown }).students)) {
        throw new Error("student_save_response_invalid");
      }
      const confirmed = (saved as { students: PlanningStudent[] }).students;
      // The student save itself may succeed even if refreshing the course
      // snapshot subsequently fails. Don't invite a duplicate student
      // submission; retain the confirmed student list and last known plan.
      try {
        return await request("load");
      } catch {
        return { ...latestConfirmed.current, students: confirmed };
      }
    });
    chain.current = work;
    try {
      const data = await work;
      if (enabled.current) {
        latestConfirmed.current = data;
        pending.current -= 1;
        if (pending.current === 0) {
          setSnapshot(data);
          setSaving(false);
        }
      }
      return true;
    } catch {
      if (enabled.current) {
        pending.current -= 1;
        if (pending.current === 0) setSaving(false);
        setError("That student couldn't be saved. Please try again.");
      }
      return false;
    }
  }, [ready, getAccessToken, request]);

  const removeChoice = useCallback((courseId: string) => {
    void mutate("remove_choice", { courseId }, current => withoutCourse(current,courseId));
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
    void mutate("set_topic", { courseId, topicId, include }, current => {
      const courses=current.courses.map(c => {
        if (c.courseId !== courseId) return c;
        const next = { ...c,
          topics: c.topics.map(t => t.topicId === topicId ? { ...t, included: include } : t) };
        return include ? next : demoteIfNoAssignedTopics(next, current.students);
      });
      const changed=courses.find(c=>c.courseId===courseId);
      const optimistic={...current,courses};
      return changed&&isUnusedSavedCourse(changed,current.students)
        ? withoutCourse(optimistic,courseId):optimistic;
    });
  }, [mutate]);
  const assignCourse = useCallback((courseId: string, studentId: string, assign: boolean) => {
    void mutate("set_course_student", { courseId, studentId, assign }, current => ({
      ...current, courses: current.courses.map(c => {
        if (c.courseId !== courseId) return c;
        const next: SavedCourse = {
          ...c, stage: assign ? "planned" : c.stage,
          ideaAll:assign ? c.ideaAll : true,
          studentIds: assign ? [...new Set([...c.studentIds, studentId])] :
            c.studentIds.filter(id => id !== studentId),
          overrides: c.overrides.filter(x => x.studentId !== studentId),
        };
        return assign ? next : demoteIfNoAssignedTopics(next, current.students);
      }),
    }));
  }, [mutate]);
  const assignTopic = useCallback((courseId: string, topicId: string, studentId: string, assign: boolean) => {
    void mutate("set_topic_student", { courseId, topicId, studentId, assign }, current => ({
      ...current, courses: current.courses.map(c => {
        if (c.courseId !== courseId) return c;
        let next: SavedCourse = {
          ...c, stage: assign ? "planned" : c.stage,
          overrides: [...c.overrides.filter(o => o.topicId !== topicId || o.studentId !== studentId),
            { topicId, studentId, assigned: assign }],
        };
        if (!assign && !current.students.some(student =>
          isTopicAssigned(next,topicId,student.id))) {
          next={...next,topics:next.topics.map(t=>t.topicId===topicId
            ? {...t,ideaChoice:t.ideaChoice==="on"?"on" :
                c.ideaAll?"inherit":"on"}:t)};
        }
        return assign ? next : demoteIfNoAssignedTopics(next, current.students);
      }),
    }));
  }, [mutate]);

  const assignStudents = useCallback((courseId: string, studentIds: string[], assigned: boolean) => {
    const unique = [...new Set(studentIds)];
    if (!unique.length) return;
    void mutate("batch_assign", { courseId, studentIds: unique, assign: assigned }, current => ({
      ...current,
      courses: current.courses.map(c => {
        if (c.courseId !== courseId) return c;
        const next: SavedCourse = {
          ...c, stage: assigned ? "planned" : c.stage,
          ideaAll: assigned ? c.ideaAll : true,
          studentIds: assigned
            ? [...new Set([...c.studentIds, ...unique])]
            : c.studentIds.filter(id => !unique.includes(id)),
          overrides: c.overrides.filter(o => !unique.includes(o.studentId)),
        };
        return assigned ? next : demoteIfNoAssignedTopics(next, current.students);
      }),
      studentPreferences: assigned ? current.studentPreferences : current.studentPreferences.filter(p =>
        p.courseId !== courseId || !unique.includes(p.studentId)),
    }));
  }, [mutate]);

  const setPreference = useCallback((courseId: string, studentId: string,
    priority: StudentPreference["priority"], arrangement: StudentPreference["arrangement"]) => {
    void mutate("set_preference", { courseId, studentId, priority, arrangement }, current => {
      const pref: StudentPreference = { courseId, studentId, priority, arrangement };
      return { ...current, studentPreferences: [
        ...current.studentPreferences.filter(p =>
          p.courseId !== courseId || p.studentId !== studentId), pref,
      ] };
    });
  }, [mutate]);

  const setAssignmentPriority = useCallback((courseId: string, studentId: string,
    topicId: string | null, priority: AssignmentPriority["priority"] | null) => {
    void mutate("set_assignment_priority", { courseId, studentId, topicId, priority }, current => {
      const base = current.assignmentPriorities.filter(p =>
        p.courseId !== courseId || p.studentId !== studentId || p.topicId !== topicId);
      return { ...current, assignmentPriorities: priority === null ? base :
        [...base, { courseId, studentId, topicId, priority }] };
    });
  }, [mutate]);

  const setSharedPriority = useCallback((courseId: string, topicId: string | null,
    priority: SharedPriority["priority"] | null) => {
    void mutate("set_shared_priority", { courseId, topicId, priority }, current => {
      const rest = current.sharedPriorities.filter(p =>
        p.courseId !== courseId || p.topicId !== topicId);
      return { ...current, sharedPriorities: priority === null ? rest :
        [...rest, { courseId, topicId, priority }] };
    });
  }, [mutate]);

  const setAssignmentArrangement = useCallback((courseId: string, studentId: string,
    topicId: string | null, arrangement: "Combined" | "Separate" | "Later" | null) => {
    void mutate("set_assignment_arrangement", { courseId, studentId, topicId, arrangement },
      current => {
        const base = current.assignmentArrangements.filter(p =>
          p.courseId !== courseId || p.studentId !== studentId || p.topicId !== topicId);
        return { ...current, assignmentArrangements: arrangement === null ? base :
          [...base, { courseId, studentId, topicId, arrangement }] };
      });
  }, [mutate]);

  const setSharedArrangement = useCallback((courseId:string,topicId:string|null,
    arrangement: SharedArrangement["arrangement"]|null)=>{
    void mutate("set_shared_arrangement",{courseId,topicId,arrangement},current=>{
      const remaining=current.sharedArrangements.filter(x=>
        x.courseId!==courseId||x.topicId!==topicId);
      return {...current,sharedArrangements:arrangement===null?remaining:
        [...remaining,{courseId,topicId,arrangement}]};
    });
  },[mutate]);

  const saveGroup = useCallback((name: string, studentIds: string[], groupId?: string) =>
    mutate("upsert_group", { groupName: name, studentIds, ...(groupId ? { groupId } : {}) }),
  [mutate]);
  const deleteGroup = useCallback((groupId: string) =>
    mutate("delete_group", { groupId }), [mutate]);

  return <Context.Provider value={{
    ready, saving, error, courses: snapshot.courses, students: snapshot.students,
    studentGroups: snapshot.studentGroups, studentPreferences: snapshot.studentPreferences,
    assignmentPriorities: snapshot.assignmentPriorities,
    sharedPriorities: snapshot.sharedPriorities,
    assignmentArrangements: snapshot.assignmentArrangements,
    sharedArrangements: snapshot.sharedArrangements,
    importIdeas, addChoice, toggleListIdea, clearListPlan, prepareListPlan,
    addStudent, removeChoice, setStage, setTopic, assignCourse, assignTopic,
    assignStudents, setPreference, setAssignmentPriority, setSharedPriority, setAssignmentArrangement, setSharedArrangement,
    saveGroup, deleteGroup, refresh,
  }}>{children}</Context.Provider>;
}
export function useDemoPlan(): DemoPlanContextValue {
  const result = useContext(Context);
  if (!result) throw new Error("DemoPlanProvider is missing");
  return result;
}
