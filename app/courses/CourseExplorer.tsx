"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, Info, Lightbulb, List, NotebookPen, Plus, Printer, Search, SlidersHorizontal } from "lucide-react";
import sourceCatalog from "./catalog-preview.json";
import { sortTopicsForCourse } from "./topic-order.mjs";
import { matchesCountry } from "./country-filter.mjs";
import { sourceChoiceForRow } from "./course-list-actions.mjs";
import { canOpenListStudentEditor } from "./list-editor-readiness.mjs";
import { subjectColor } from "./legacy-subject-colors.mjs";
import { listRowStatus } from "./list-row-status.mjs";
import PlacementSymbol from "../components/PlacementSymbol";
import { usePlanningDesk } from "../components/PlanningDeskContext";
import { usePlannerAuth } from "../components/PlannerAuthProvider";
import PlanningDesk from "../components/PlanningDesk";
import DetailViewSwitch, { type DetailMode } from "../components/DetailViewSwitch";
import StudentAssignmentEditor from "../components/StudentAssignmentEditor";
import SharedTopicStudentEditor from "../components/SharedTopicStudentEditor";
import { useDemoPlan, type PlanningStudent, type SavedCourse } from "../components/DemoPlanContext";

type Plan = {
  id: string;
  editionId: string;
  type: "Topic" | "Single-Topic Course" | "Combined Course";
  title: string;
  editionTitle: string;
  sort: string;
  presentationSort: string;
  description: string | null;
  tips: string | null;
  country: string | null;
  cycle: string | null;
  subject: string;
  subjectSort: number | null;
  grades: number[];
  gradeDisplay: string | null;
  schedules: Array<{
    id: string;
    text: string;
    weekly: number | null;
    weeklyPlus: boolean;
    minutes: number | null;
    minutesPlus: boolean;
    period: string | null;
    teacher: string | null;
    gradeBand: string | null;
    note: string | null;
  }>;
};
type TopicLink = { parentEditionId: string; childEditionId: string };
type ChoiceGroup = {
  id: string;
  title: string;
  guidance: string | null;
  grades: number[];
  courseIds: string[];
};
type Catalog = {
  releaseYear: string;
  releaseStatus: string;
  sourceEditionCount: number;
  courses: Plan[];
  topicLinks: TopicLink[];
  choiceGroups: ChoiceGroup[];
};
type Mode = "browse" | "plan";
type PlanTarget = { courseId: string; topicId: string | null };
type DisplayRow =
  | { kind: "course"; sort: string; course: Plan }
  | { kind: "choice"; sort: string; group: ChoiceGroup; options: Plan[] };

const catalog = sourceCatalog as Catalog;
const compareText = (a: string, b: string) => a < b ? -1 : a > b ? 1 : 0;
const comparePlan = (a: Plan, b: Plan) =>
  compareText(a.presentationSort, b.presentationSort) ||
  compareText(a.sort, b.sort) ||
  compareText(a.id, b.id);
const allGrades = Array.from({ length: 12 }, (_, i) => i + 1);

function gradeLabel(grades: number[]): string {
  if (!grades.length) return "Grades vary";
  const values = [...new Set(grades)].sort((a, b) => a - b);
  if (values.length === 1) return "Grade " + values[0];
  if (values.length > 2 && values[values.length - 1] - values[0] === values.length - 1) {
    return "Grades " + values[0] + "–" + values[values.length - 1];
  }
  return "Grades " + values.join(", ");
}

function TipCallout({ children }: { children: React.ReactNode }) {
  return <div className="cx-tip">
    <span className="cx-tip-icon"><PlacementSymbol /></span>
    <p>{children}</p>
  </div>;
}

type CourseRowProps = {
  course: Plan;
  nested?: boolean;
  childTopics: Map<string, Plan[]>;
  mode: Mode;
  planned: readonly string[];
  onPlannedToggle: (courseId:string,topicId:string|null) => void;
  onRemovePlan: (courseId:string,topicId:string|null) => void;
  parentCourseId?: string;
  parentSubject?: string;
  detailMode: DetailMode;
  detailRevision: number;
  savedCourses: readonly SavedCourse[];
  students: readonly PlanningStudent[];
  planningTarget: PlanTarget | null;
  onStartPlan: (courseId: string, topicId: string | null) => void;
  onEndPlan: () => void;
};

/**
 * A stable component type is essential here. Previously CourseRow was declared
 * inside CourseExplorer and recreated on every state change; React therefore
 * remounted the clicked row, discarded focus and could jump the scroll position.
 *
 * Expansion is intentionally LOCAL to this rendered occurrence. The same plan
 * may appear under different parents or in multiple grade-specific choice
 * groups, but opening one occurrence must not open its other appearances.
 */
function CourseRow({
  course,
  nested = false,
  childTopics,
  mode,
  planned,
  onPlannedToggle,
  onRemovePlan,
  parentCourseId,
  parentSubject,
  detailMode,
  detailRevision,
  savedCourses,
  students,
  planningTarget,
  onStartPlan,
  onEndPlan,
}: CourseRowProps) {
  const [disclosureOverride, setDisclosureOverride] = useState<{
    revision: number; expanded: boolean;
  } | null>(null);
  const isExpanded = disclosureOverride?.revision === detailRevision
    ? disclosureOverride.expanded : detailMode === "expanded";
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const beforeToggleTop = useRef<number | null>(null);
  const detailsId = useId(); // unique for each occurrence, not the shared curriculum ID
  const isCombined = course.type === "Combined Course";
  const children = sortTopicsForCourse(course, childTopics.get(course.editionId) ?? []);
  const canExpand = Boolean(
    children.length || course.description || course.tips ||
    (!isCombined && (course.grades.length || course.schedules.length))
  );
  const sourceChoice = sourceChoiceForRow(course.id, parentCourseId);
  const sourceCourseId = sourceChoice.courseId;
  const parentChoice = savedCourses.find(choice => choice.courseId === sourceCourseId);
  const status = listRowStatus(parentChoice, students, sourceChoice.topicId,
    isCombined, planned.includes(sourceCourseId));
  const activePlanEditor = planningTarget?.courseId === sourceCourseId &&
    planningTarget.topicId === sourceChoice.topicId;
  const subjectHex = subjectColor(parentSubject ?? course.subject);
  const subjectVars = {
    "--cx-subject": subjectHex,
    "--cx-subject-soft": subjectHex + "29",
    "--cx-subject-pale": subjectHex + "15",
    "--cx-subject-medium": subjectHex + "4D",
  } as CSSProperties;

  // Keep the clicked row in the same visible place when content above/below
  // shrinks or expands. Browsers can otherwise reanchor the long Course List.
  useLayoutEffect(() => {
    const previousY = beforeToggleTop.current;
    beforeToggleTop.current = null;
    const nextY = disclosureRef.current?.getBoundingClientRect().top;
    if (previousY !== null && nextY !== undefined && Math.abs(nextY - previousY) > 1) {
      window.scrollBy(0, nextY - previousY);
    }
  }, [isExpanded]);

  function toggleDetails() {
    beforeToggleTop.current = disclosureRef.current?.getBoundingClientRect().top ?? null;
    setDisclosureOverride({revision:detailRevision,expanded:!isExpanded});
  }

  const childProps: Omit<CourseRowProps, "course" | "nested"> = {
    childTopics, mode, planned, onPlannedToggle, onRemovePlan,
    parentCourseId: sourceCourseId,
    parentSubject: parentSubject ?? course.subject,
    detailMode, detailRevision, savedCourses, students, planningTarget,
    onStartPlan, onEndPlan,
  };

  return <div style={subjectVars} className={"cx-course" +
    (nested ? " cx-course--topic" : "") +
    (isExpanded ? " is-expanded" : "") +
    (mode === "plan" && status.planTone !== "none" ? " cx-status-" + status.planTone : "") +
    (mode === "plan" && status.ideaActive ? " cx-status-idea" : "") +
    (mode === "plan" && status.contextTone !== "none" ? " cx-context-" + status.contextTone : "")}>
    <div className="cx-course-head">
      <button ref={disclosureRef} type="button" className="cx-course-disclosure"
        aria-expanded={canExpand ? isExpanded : undefined}
        aria-controls={canExpand ? detailsId : undefined}
        disabled={!canExpand} title={canExpand ? (isExpanded ? "Hide details" : "View details") : undefined}
        onClick={toggleDetails}>
        <span className="cx-course-name">{course.title}</span>
      </button>
      <div className="cx-course-actions">
        {canExpand && <button type="button" className={"cx-info-action" +
          (isExpanded ? " is-open" : "") +
          (mode === "plan" ? " is-member" : "")}
          aria-controls={detailsId} aria-expanded={isExpanded}
          aria-label={(isExpanded ? "Hide" : "View") + " details for " + course.title}
          title={(isExpanded ? "Hide" : "View") + " description and topics"}
          onClick={toggleDetails}>
          <span className="cx-info-word">{isExpanded ? "Hide" : "View"}</span>
          <Info size={16} strokeWidth={1.8} aria-hidden="true"/>
        </button>}
        {mode === "plan" && <>
          <button type="button" className={"cx-idea-action" +
            (status.ideaActive ? " is-selected is-tone-" + status.ideaTone : "")}
            aria-label={status.ideaTone === "full"
              ? "Remove " + course.title + " from Think Tank"
              : status.ideaTone === "inherited"
                ? "Remove only " + course.title + " from Think Tank"
              : status.ideaTone === "partial"
                ? "Add all topics of " + course.title + " to Think Tank"
                : "Add " + course.title + (nested ? " through its parent" : "") + " to Think Tank"}
            aria-pressed={status.ideaActive}
            disabled={status.excluded ||
              (status.planActive && (nested || status.planTone==="full"))}
            title={status.excluded ? "Restore this topic in Planning first" :
              status.ideaTone === "full" ? "Remove this selection from Think Tank" :
              status.ideaTone === "inherited" ? "Remove only this inherited topic idea" :
              status.ideaTone === "partial" ? "Select all topics for Think Tank" :
              "Save this selection to Think Tank"}
            onClick={() => onPlannedToggle(sourceCourseId,sourceChoice.topicId)}>
            <Lightbulb size={16} strokeWidth={1.8} aria-hidden="true"/>
          </button>
          <button type="button" className={"cx-direct-plan-action" +
            (status.planActive ? " is-selected" : "") +
            (status.planTone !== "none" ? " is-tone-" + status.planTone : "") +
            (activePlanEditor ? " is-open" : "")}
            aria-expanded={activePlanEditor}
            aria-pressed={status.planActive}
            aria-label={status.planActive && (nested || status.planTone==="full")
              ? "Remove " + course.title + " from all assigned students"
              : nested ? "Plan only " + course.title + " through " + sourceCourseId
                : isCombined ? "Plan all included topics in " + course.title
                : "Plan " + course.title}
            title={status.excluded ? "Restore this topic in Planning first" :
              status.planActive && (nested || status.planTone==="full")
              ? "Remove this selection from every assigned student" :
              nested ? "Assign only this topic through its parent" :
              isCombined ? "Assign all included topics" : "Assign students"}
            disabled={status.excluded}
            onClick={() => {
              if (status.planActive && (nested || status.planTone==="full")) {
                onRemovePlan(sourceCourseId,sourceChoice.topicId);
              } else onStartPlan(sourceCourseId,sourceChoice.topicId);
            }}>
            <Plus size={17} strokeWidth={1.9} aria-hidden="true"/>
            {isCombined && !nested && <span className="cx-plus-all">All</span>}
          </button>
        </>}
      </div>
    </div>
    {mode === "plan" && activePlanEditor && <div className="cx-inline-assign" role="region"
      aria-label={"Assign students for " + course.title}>
      {!canOpenListStudentEditor(parentChoice, course.type, nested) ?
        <p role="status" className="cx-assign-loading">
        Saving the parent course before opening student choices…
      </p> : nested && !parentChoice.topics.some(topic => topic.topicId === course.id && topic.included)
        ? <p className="cx-assign-loading" role="status">
            This topic was removed from the saved combined course. Restore it in Planning to assign it.
            <button type="button" className="cx-assign-dismiss" onClick={onEndPlan}>Close</button>
          </p>
        : nested ? <SharedTopicStudentEditor
            topicEditionId={course.editionId} currentCourseId={sourceCourseId}
            onClose={onEndPlan} onCancel={onEndPlan}/> :
          <StudentAssignmentEditor course={parentChoice}
            onClose={onEndPlan} onCancel={onEndPlan}/>}
    </div>}
    {canExpand && isExpanded && <div className="cx-course-details" id={detailsId}>
      {!isCombined && <div className="cx-course-meta">
        {course.schedules.length > 0 && <div className="cx-schedule-list">
          {course.schedules.map(schedule => <span key={schedule.id} className="cx-schedule-item">
            {schedule.text}
          </span>)}
        </div>}
        <span className="cx-grade-detail">{course.gradeDisplay || gradeLabel(course.grades)}</span>
      </div>}
      {course.description && <p className="cx-description">{course.description}</p>}
      {course.tips && <TipCallout>{course.tips}</TipCallout>}
      {children.length > 0 && <div className="cx-topic-list" aria-label={"Topics in " + course.title}>
        <div className="cx-topic-heading">Topics</div>
        {children.map(child => <CourseRow key={child.id} course={child} nested {...childProps} />)}
      </div>}
    </div>}
  </div>;
}

export default function CourseExplorer() {
  const desk = usePlanningDesk();
  const cloud = useDemoPlan();
  const { status } = usePlannerAuth();
  const signedIn = status === "signed-in";
  const mode: Mode = signedIn ? desk.courseMode : "browse";
  const setMode = desk.setCourseMode;
  const grades = desk.grades;
  const setGrades = desk.setGrades;
  const country = desk.country;
  const setCountry = desk.setCountry;
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [gradesOpen, setGradesOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [detailRevision, setDetailRevision] = useState(0);
  const [planningTarget, setPlanningTarget] = useState<PlanTarget | null>(null);
  const gradeButtonRef = useRef<HTMLButtonElement>(null);
  const gradePanelRef = useRef<HTMLDivElement>(null);
  const planned = desk.thinkTankIds;
  function updateDetailMode(next: DetailMode) {
    if (desk.listDetails === next) return;
    desk.setListDetails(next);
    setDetailRevision(revision => revision + 1);
  }
  function startDirectPlan(courseId: string, topicId: string | null) {
    if (!cloud.ready) return;
    const same = planningTarget?.courseId === courseId && planningTarget.topicId === topicId;
    if (same) { setPlanningTarget(null); return; }
    // Save the exact parent WITHOUT adding unrelated topics to Think Tank.
    // The student editor will open after the confirmed child links arrive.
    if (!cloud.courses.some(course=>course.courseId===courseId)) {
      cloud.prepareListPlan(courseId,topicId);
    }
    setPlanningTarget({courseId,topicId});
  }

  useEffect(() => {
    if (!gradesOpen) return;
    function closeIfOutside(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (gradeButtonRef.current?.contains(target) || gradePanelRef.current?.contains(target)) return;
      setGradesOpen(false);
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setGradesOpen(false);
      gradeButtonRef.current?.focus();
    }
    document.addEventListener("pointerdown", closeIfOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeIfOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [gradesOpen]);

  const plansById = useMemo(() => new Map(catalog.courses.map(c => [c.id, c])), []);
  const plansByEditionId = useMemo(() => new Map(catalog.courses.map(c => [c.editionId, c])), []);
  const childTopics = useMemo(() => {
    const map = new Map<string, Plan[]>();
    for (const link of catalog.topicLinks) {
      const topic = plansByEditionId.get(link.childEditionId);
      if (topic) map.set(link.parentEditionId, [...(map.get(link.parentEditionId) ?? []), topic]);
    }
    return map;
  }, [plansByEditionId]);

  const groupedIds = useMemo(() => new Set(catalog.choiceGroups.flatMap(g => g.courseIds)), []);
  const courses = useMemo(() => catalog.courses.filter(c => c.type !== "Topic"), []);
  const subjects = useMemo(() => {
    const unique = new Map<string, number>();
    for (const course of courses) unique.set(course.subject, Math.min(unique.get(course.subject) ?? 9999, course.subjectSort ?? 9999));
    return [...unique].sort((a, b) => a[1] - b[1] || compareText(a[0], b[0])).map(x => x[0]);
  }, [courses]);

  const normalizedQuery = query.trim().toLocaleLowerCase();
  function matchesText(course: Plan) {
    if (!normalizedQuery) return true;
    const children = childTopics.get(course.editionId) ?? [];
    return [course.title, course.description, course.tips,
      ...children.flatMap(t => [t.title, t.description, t.tips])]
      .some(text => text?.toLocaleLowerCase().includes(normalizedQuery));
  }

  const subjectRows = useMemo(() => {
    const sectionMap = new Map<string, DisplayRow[]>();
    const add = (subjectName: string, row: DisplayRow) => {
      sectionMap.set(subjectName, [...(sectionMap.get(subjectName) ?? []), row]);
    };

    // Once a course belongs to ANY active 2027–28 choice group, suppress its
    // standalone row in every grade filter. The group grade controls placement.
    for (const course of courses) {
      if (groupedIds.has(course.id)) continue;
      if (subject && course.subject !== subject) continue;
      if (!matchesCountry(course.country, country)) continue;
      // Airtable's Display Grade can be "GRADES: 1+". Those courses apply
      // to higher grades even when only the starting grade is linked.
      const isGradePlus = course.gradeDisplay?.trim().endsWith("+") ?? false;
      const minGrade = Math.min(...course.grades);
      if (grades.length && !course.grades.some(g => grades.includes(g)) &&
          !(isGradePlus && grades.some(g => g >= minGrade))) continue;
      if (!matchesText(course)) continue;
      add(course.subject, { kind: "course", sort: course.presentationSort, course });
    }

    for (const group of catalog.choiceGroups) {
      if (grades.length && !group.grades.some(g => grades.includes(g))) continue;
      const allOptions = group.courseIds
        .map(id => plansById.get(id))
        .filter((item): item is Plan => !!item && item.type !== "Topic" && matchesCountry(item.country, country));
      if (!allOptions.length) continue;
      // Keep the author's grade-specific options together. Never infer display
      // grades from linked course eligibility (science differs by grade).
      const groupSubject = allOptions[0].subject;
      if (subject && !allOptions.some(item => item.subject === subject)) continue;
      const groupMatchesSearch = normalizedQuery && [group.title, group.guidance]
        .some(text => text?.toLocaleLowerCase().includes(normalizedQuery));
      const options = groupMatchesSearch ? allOptions : allOptions.filter(matchesText);
      if (!options.length) continue;
      options.sort(comparePlan);
      add(groupSubject, { kind: "choice", sort: options[0].presentationSort, group, options });
    }
    const result = [...sectionMap.entries()]
      .map(([name, rows]) => ({ name, rows: rows.sort((a, b) =>
        compareText(a.sort, b.sort) ||
        compareText(a.kind === "choice" ? a.options[0].sort : a.course.sort,
                    b.kind === "choice" ? b.options[0].sort : b.course.sort) ||
        compareText(a.kind === "choice" ? a.group.id : a.course.id,
                    b.kind === "choice" ? b.group.id : b.course.id)) }))
      .sort((a, b) => (subjects.indexOf(a.name) - subjects.indexOf(b.name)) || compareText(a.name, b.name));
    return result;
  // Use primitive render keys here; grades and query intentionally recompute results.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courses, groupedIds, subject, grades, country, normalizedQuery, plansById, childTopics, subjects]);

  const courseRowProps: Omit<CourseRowProps, "course" | "nested"> = {
    childTopics,
    mode: signedIn && cloud.ready ? "plan" : "browse",
    planned,
    onPlannedToggle: (courseId,topicId) => {
      if (!cloud.ready) return;
      cloud.toggleListIdea(courseId,topicId);
    },
    onRemovePlan: (courseId,topicId) => {
      if (!cloud.ready) return;
      if (planningTarget?.courseId===courseId &&
          planningTarget.topicId===topicId) setPlanningTarget(null);
      cloud.clearListPlan(courseId,topicId);
    },
    detailMode: desk.listDetails,
    detailRevision,
    savedCourses: cloud.courses,
    students: cloud.students,
    planningTarget,
    onStartPlan: startDirectPlan,
    onEndPlan: () => setPlanningTarget(null),
  };

  return <div className="cx-page">
    <header className="cx-heading">
      <h1>{signedIn && mode === "plan" ? "Planning Desk" : signedIn ? "Course List" : "Explore Courses"}</h1>
      <p className="cx-lead">{signedIn && mode === "plan"
        ? "Consider your ideas alongside your chosen courses and organize your family plan."
        : "Discover courses, explore subjects, and consider possibilities for your school year."}</p>
    </header>

    <div className="cx-toolbar-sticky">
    <div className="cx-toolbar" aria-label="Course List tools">
      {signedIn && <div className="cx-mode-switch" role="group" aria-label="Course views">
        <button type="button" className={mode === "browse" ? "is-current" : ""} onClick={() => setMode("browse")}>
          <List size={14} /> List
        </button>
        {signedIn && <button type="button" className={mode === "plan" ? "is-current" : ""} onClick={() => setMode("plan")}>
          <NotebookPen size={14} /> Planning
        </button>}
      </div>}
      {mode !== "plan" && <>
      <DetailViewSwitch label={signedIn ? "Course List" : "Explore"}
        value={desk.listDetails} onChange={updateDetailMode}/>
      <button type="button" className="cx-mobile-filter-toggle"
        aria-controls="cx-toolbar-filter-tools" aria-expanded={mobileFiltersOpen}
        onClick={() => { setMobileFiltersOpen(value => !value); setGradesOpen(false); }}>
        <SlidersHorizontal size={15}/> Filters
        <ChevronDown size={13} aria-hidden="true"/>
      </button>
      <div className={"cx-toolbar-tools" + (mobileFiltersOpen ? " is-mobile-expanded" : "")}
        id="cx-toolbar-filter-tools">
        <button type="button" className={"cx-filter-control" + (grades.length ? " has-value" : "")}
          ref={gradeButtonRef} onClick={() => setGradesOpen(v => !v)} aria-expanded={gradesOpen} aria-controls="cx-grade-options">
          <SlidersHorizontal size={14} /> {grades.length ? gradeLabel(grades) : "All grades"}{country !== "all" ? " · " + (country === "us" ? "U.S." : "Canada") : ""}
          <ChevronDown size={13} />
        </button>
        <label className="sr-only" htmlFor="cx-subject-filter">Filter by subject</label>
        <select id="cx-subject-filter" className={"cx-subject-select" + (subject ? " has-value" : "")}
          value={subject} onChange={event => setSubject(event.target.value)}>
          <option value="">All subjects</option>
          {subjects.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="cx-search">
          <Search size={15} aria-hidden="true" />
          <span className="sr-only">Find a course or topic</span>
          <input type="search" placeholder="Find a course" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
        <button type="button" className="cx-print" onClick={() => window.print()} title="Print current list" aria-label="Print current list">
          <Printer size={17} />
        </button>
      </div>
      </>}
    </div>
    {mode !== "plan" && <div className="cx-mobile-filter-summary" aria-label="Current course filters">
      <span>{grades.length ? gradeLabel(grades) : "All grades"}</span>
      {country !== "all" && <span>{country === "us" ? "U.S." : "Canada"}</span>}
      {subject && <span>{subject}</span>}
      {query && <span>Search active</span>}
    </div>}

    {mode !== "plan" && gradesOpen && <div ref={gradePanelRef} className="cx-grade-panel" id="cx-grade-options">
      <div className="cx-grade-panel-heading">
        <span>Show courses for</span>
        <button type="button" onClick={() => { setGrades([]); setGradesOpen(false); }}>All grades</button>
      </div>
      <div className="cx-grade-choices">
        {allGrades.map(grade => <label key={grade} className={grades.includes(grade) ? "is-checked" : ""}>
          <input type="checkbox" checked={grades.includes(grade)}
            onChange={() => setGrades(current => current.includes(grade) ? current.filter(x => x !== grade) : [...current, grade].sort((a,b) => a-b))} />
          {grade}
        </label>)}
      </div>
      <p>Select more than one grade to see where courses can be shared or grouped differently.</p>
      <div className="cx-country-filter" role="group" aria-label="Filter courses by country">
        <span className="cx-country-label">Country</span>
        <div className="cx-country-options">
          {([
            { id: "all" as const, label: "All" },
            { id: "us" as const, label: "U.S." },
            { id: "canada" as const, label: "Canada" },
          ]).map(option => <button type="button" key={option.id}
            className={country === option.id ? "is-selected" : ""}
            aria-pressed={country === option.id}
            onClick={() => setCountry(option.id)}>{option.label}</button>)}
        </div>
        <span className="cx-country-hint">Shared courses stay visible in both.</span>
      </div>
    </div>}
    </div>


    {signedIn && mode === "plan" ? <PlanningDesk variant="full" /> : <div className="cx-page-columns">
      <div className="cx-list-column">
        {subjectRows.length > 0 ? subjectRows.map(section =>
          <section className="cx-subject" key={section.name} aria-label={section.name}>
            <h2>{section.name}</h2>
            <div className="cx-rows">{section.rows.map(row => row.kind === "course" ?
              <CourseRow key={row.course.id} course={row.course} {...courseRowProps} /> :
              <div className="cx-choice cx-choice--accent" key={row.group.id}>
                <div className="cx-choice-header">
                  <h3>{row.group.title}</h3>
                  {row.group.guidance && <p>{row.group.guidance}</p>}
                </div>
                <div>{row.options.map(option => <CourseRow key={option.id} course={option} {...courseRowProps} />)}</div>
              </div>)}</div>
          </section>
        ) : <div className="cx-empty">
          <h2>No courses match these filters.</h2>
          <p>Try another subject, grade, or search.</p>
          <button type="button" onClick={() => { setGrades([]); setCountry("all"); setSubject(""); setQuery(""); }}>Show all courses</button>
        </div>}
      </div>
    </div>}
  </div>;
}
