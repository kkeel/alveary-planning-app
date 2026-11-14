"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Bookmark, Check, ChevronDown, List, NotebookPen, Printer, Search, SlidersHorizontal } from "lucide-react";
import sourceCatalog from "./catalog-preview.json";
import { sortTopicsForCourse } from "./topic-order.mjs";
import { matchesCountry } from "./country-filter.mjs";
import type { CountryFilter } from "./country-filter.mjs";
import PlacementSymbol from "../components/PlacementSymbol";
import { usePlanningDesk } from "../components/PlanningDeskContext";

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
  onPlannedToggle: (id: string) => void;
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
}: CourseRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const beforeToggleTop = useRef<number | null>(null);
  const detailsId = useId(); // unique for each occurrence, not the shared curriculum ID
  const isCombined = course.type === "Combined Course";
  const children = sortTopicsForCourse(course, childTopics.get(course.editionId) ?? []);
  const canExpand = Boolean(
    children.length || course.description || course.tips ||
    (!isCombined && (course.grades.length || course.schedules.length))
  );
  const isPlanned = planned.includes(course.id);

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
    setIsExpanded(value => !value);
  }

  const childProps: Omit<CourseRowProps, "course" | "nested"> = {
    childTopics, mode, planned, comparison, onPlannedToggle, onComparisonToggle,
  };

  return <div className={"cx-course" + (nested ? " cx-course--topic" : "") + (isExpanded ? " is-expanded" : "")}>
    <div className="cx-course-head">
      <button ref={disclosureRef} type="button" className="cx-course-disclosure"
        aria-expanded={canExpand ? isExpanded : undefined}
        aria-controls={canExpand ? detailsId : undefined}
        disabled={!canExpand}
        onClick={toggleDetails}>
        <span className="cx-course-name">{course.title}</span>
        {canExpand && <span className="cx-view-label">{isExpanded ? "Hide details" : "View details"}</span>}
        {canExpand && <ChevronDown size={16} strokeWidth={1.7} className="cx-chevron" aria-hidden="true" />}
      </button>
      {mode === "plan" && <button className={"cx-row-action" + (isPlanned ? " is-selected" : "")}
        type="button"
        aria-label={(isPlanned ? "Remove " : "Save ") + course.title + (isPlanned ? " from " : " to ") + "Think Tank"}
        aria-pressed={isPlanned} onClick={() => onPlannedToggle(course.id)}>
        {isPlanned ? <Check size={15} /> : <Bookmark size={15} />}
      </button>}

    </div>
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
        {children.map(child => <CourseRow key={child.id} course={child} nested {...childProps} />)}
      </div>}
    </div>}
  </div>;
}

export default function CourseExplorer() {
  const desk = usePlanningDesk();
  const mode: Mode = desk.courseMode;
  const setMode = desk.setCourseMode;
  const [grades, setGrades] = useState<number[]>([]);
  const [country, setCountry] = useState<CountryFilter>("all");
  const [subject, setSubject] = useState("");
  const [query, setQuery] = useState("");
  const [gradesOpen, setGradesOpen] = useState(false);
  const gradeButtonRef = useRef<HTMLButtonElement>(null);
  const gradePanelRef = useRef<HTMLDivElement>(null);
  const planned = desk.thinkTankIds;

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
    mode,
    planned,
    onPlannedToggle: desk.toggleIdea,
  };

  return <div className="cx-page">
    <header className="cx-heading">
      <h1>Course List</h1>
      <p className="cx-lead">Discover courses, explore subjects, and consider possibilities for your school year.</p>
    </header>

    <div className="cx-toolbar-sticky">
    <div className="cx-toolbar" aria-label="Course List tools">
      <div className="cx-mode-switch" role="group" aria-label="Course browsing mode">
        <button type="button" className={mode === "browse" ? "is-current" : ""} onClick={() => setMode("browse")}>
          <List size={14} /> List
        </button>
        <button type="button" className={mode === "plan" ? "is-current" : ""} onClick={() => setMode("plan")}>
          <NotebookPen size={14} /> Planning
        </button>
      </div>
      <div className="cx-toolbar-tools">
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
    </div>

    {gradesOpen && <div ref={gradePanelRef} className="cx-grade-panel" id="cx-grade-options">
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


    <div className="cx-page-columns">
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
    </div>
  </div>;
}
