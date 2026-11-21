"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlignJustify, ArrowLeft, BookOpen, BookOpenText, List, ListTree, NotebookPen, Search } from "lucide-react";
import courses from "../courses/catalog-preview.json";
import resources from "./catalog-resources-preview.json";
import { buildBookCourseGroups } from "./book-course-groups.mjs";
import BookCourseHierarchy from "./BookCourseHierarchy";
import PlanningDesk from "../components/PlanningDesk";
import { usePlanningDesk } from "../components/PlanningDeskContext";
import { usePlannerAuth } from "../components/PlannerAuthProvider";
import { useDemoPlan } from "../components/DemoPlanContext";
import "./book-planning.css";

const coursesById = new Map(courses.courses.map(c => [c.id,c]));
const coursesByEdition = new Map(courses.courses.map(c => [c.editionId,c]));
const linkedTopics = new Map<string, (typeof courses.courses)[number][]>();
for (const link of courses.topicLinks) {
  const topic = coursesByEdition.get(link.childEditionId);
  if (!topic) continue;
  const siblings = linkedTopics.get(link.parentEditionId) ?? [];
  if (!siblings.some(candidate => candidate.id === topic.id)) siblings.push(topic);
  linkedTopics.set(link.parentEditionId,siblings);
}
const courseSubjects = [...new Set(courses.courses.map(c => c.subject))]
  .sort((a,b) => a.localeCompare(b));

function BookListContent() {
  const desk = usePlanningDesk();
  const plan = useDemoPlan();
  const {status} = usePlannerAuth();
  const signedIn = status === "signed-in";
  const params = useSearchParams();
  const router = useRouter();
  const [query,setQuery] = useState("");
  const [subject,setSubject] = useState("");
  const [term,setTerm] = useState<"all"|"1"|"2"|"3">("all");
  // Public Explore starts with the complete book details regardless of any
  // member preference previously stored in this browser.
  const [publicDensity,setPublicDensity] = useState<"compact"|"topics"|"detailed">("detailed");
  const mode = signedIn ? desk.bookMode : "browse";
  const requestedId = params.get("course");
  const requestedTopicId = params.get("topic");
  const lastFocus=useRef<string|null>(null);

  useEffect(() => {
    const key=requestedId ? requestedId+":"+(requestedTopicId??"") : null;
    if(key && lastFocus.current!==key && signedIn) {
      lastFocus.current=key;
      desk.setBookMode("browse");
    }
    if(!key)lastFocus.current=null;
  },[requestedId,requestedTopicId,signedIn,desk]);

  const requested=requestedId ? coursesById.get(requestedId) : undefined;
  const parent=requested && requested.type!=="Topic" ? requested : undefined;
  const topicOnly=requested && requested.type==="Topic" ? requested : undefined;
  const childTopics=parent ? (linkedTopics.get(parent.editionId)??[]) : [];
  const validTopic=requestedTopicId && childTopics.some(t=>t.id===requestedTopicId)
    ? childTopics.find(t=>t.id===requestedTopicId) : undefined;
  const focusError=Boolean((requestedId&&!requested)||(requestedTopicId&&!validTopic));
  const focus=focusError ? undefined : validTopic??parent??topicOnly;
  const signedInScope = signedIn && desk.bookScope==="school" ? "school" : "all";

  // One course/topic-first view, filtering each assignment in its exact
  // edition context so that shared books and Choose One groups stay clear.
  const grouped=useMemo(()=>buildBookCourseGroups(resources,courses,{
    scope:requestedId?"all":signedInScope,
    savedCourses:plan.courses,
    students:plan.students,
    subject,grades:desk.grades,country:desk.country,query,term,
    focusCourseId:focusError?"unknown-course-focus":requestedId,
    focusTopicId:validTopic?.id??null,
  }),[signedInScope,plan.courses,plan.students,subject,desk.grades,
    desk.country,query,term,requestedId,validTopic?.id,focusError]);
  const density=signedIn ? desk.bookDetails : publicDensity;
  const changeDensity=(next:typeof density)=>{
    if (signedIn) desk.setBookDetails(next);
    else setPublicDensity(next);
  };
  const hasCourseFilters=desk.grades.length>0||desk.country!=="all";

  return <div className="bk-page">
    <header className="bk-heading">
      <div className="bk-heading-top">
        <div>
          <h1>{signedIn && mode==="plan" ? "Book Planning" :
            requestedId ? "Course Books" :
            signedIn ? signedInScope==="school" ? "My School Books" : "All Books" :
            "Explore Books"}</h1>
          {mode==="plan" && <p>Organize your school books and budget in one place.</p>}
          {!signedIn && <p>Browse the books and resources used in Alveary.</p>}
        </div>
        {signedIn && <Link className="bk-back-link" href="/courses"
          onClick={()=>desk.setCourseMode("browse")}>
          <ArrowLeft size={14}/> Course List
        </Link>}
      </div>
      <div className="bk-toolbar" aria-label="Book List views">
        {signedIn && <div className="bk-mode-switch" role="group" aria-label="Book views">
          <button type="button" className={mode==="browse"?"is-current":""}
            aria-pressed={mode==="browse"} onClick={()=>desk.setBookMode("browse")}>
            <List size={14}/> List
          </button>
          <button type="button" className={mode==="plan"?"is-current":""}
            aria-pressed={mode==="plan"} onClick={()=>desk.setBookMode("plan")}>
            <NotebookPen size={14}/> Planning
          </button>
        </div>}
        {signedIn && mode==="browse" && !requestedId && <button type="button"
          className="bk-browse-switch"
          onClick={()=>desk.setBookScope(signedInScope==="school"?"all":"school")}>
          {signedInScope==="school" ? "Browse all books" : "Return to My School Books"}
        </button>}
        {mode==="browse" && <div className="bk-display-switch" role="group" aria-label="Book details">
            <button type="button" className={density==="compact"?"is-current":""}
              aria-pressed={density==="compact"} onClick={()=>changeDensity("compact")}>
              <AlignJustify size={14}/> Compact
            </button>
            <button type="button" className={density==="topics"?"is-current":""}
              aria-pressed={density==="topics"} onClick={()=>changeDensity("topics")}>
              <ListTree size={14}/> Expanded
            </button>
            <button type="button" className={density==="detailed"?"is-current":""}
              aria-pressed={density==="detailed"} onClick={()=>changeDensity("detailed")}>
              <BookOpenText size={14}/> Detailed
            </button>
          </div>}
      </div>
    </header>
    {mode==="plan" ? <PlanningDesk variant="full"/> : <>
      {requestedId && <section className="bk-focused" aria-label="Book List course focus">
        <div className="bk-focused-header">
          <h2>{focusError?"Course or topic focus unavailable":
            <>Viewing books for: {focus?.title}</>}</h2>
          <button type="button" onClick={()=>router.push("/books")}>Clear focus</button>
        </div>
        {focusError ? <p>The requested course/topic relationship wasn't found in this release.</p> : <>
          <p>{parent?.subject??topicOnly?.subject}
            {parent&&validTopic?<> · From {parent.title}</>:null}
            {parent?.gradeDisplay?<> · {parent.gradeDisplay}</>:null}</p>
          <p>Showing the selected edition's assigned resources
            {parent&&!validTopic?" and its included topic editions":""}.
            A single book may appear in more than one course.</p>
        </>}
        <Link href="/courses" onClick={()=>desk.setCourseMode("browse")}>
          <ArrowLeft size={13}/> Return to Course List
        </Link>
      </section>}

      <div className="bk-catalog-toolbar" aria-label="Find and filter books">
        <div className="bk-catalog-primary">
          <label className="bk-course-search">
            <Search size={15} aria-hidden="true"/>
            <span className="sr-only">Search books</span>
            <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
              placeholder="Search books, courses, or topics"/>
          </label>
          <div className="bk-filters">
            {!requestedId && <label className="bk-select-label">Subject
              <select value={subject} onChange={e=>setSubject(e.target.value)}>
                <option value="">All subjects</option>
                {courseSubjects.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </label>}
            <label className="bk-select-label">Term
              <select value={term} onChange={e=>setTerm(e.target.value as typeof term)}>
                <option value="all">All terms</option>
                <option value="1">Term 1</option><option value="2">Term 2</option><option value="3">Term 3</option>
              </select>
            </label>
            {!requestedId && hasCourseFilters && <button type="button" className="bk-grade-chip"
              title="Clear Course List grade and country filters"
              onClick={()=>{desk.setGrades([]);desk.setCountry("all");}}>
              {desk.grades.length===1 ? "Grade "+desk.grades[0] : desk.grades.length>1 ? desk.grades.length+" grades" : "All grades"}
              {desk.country!=="all" ? " · "+(desk.country==="us"?"U.S.":"Canada") : ""} ×
            </button>}
          </div>

        </div>
      </div>
      {grouped.sections.length ?
        <BookCourseHierarchy
          key={[signedInScope,requestedId,validTopic?.id,query,term,subject,
            desk.grades.join(","),desk.country].join("|")}
          grouped={grouped} density={density} courseByEdition={coursesByEdition}
          memberView={signedIn}
          openCourses={signedInScope==="school"||Boolean(requestedId)||
            Boolean(query.trim())||Boolean(subject)}/>
        : <div className="bk-notice">
          <h2>{signedInScope==="school"&&plannedCount===0&&!requestedId ?
            "Start with your courses" : "No books match this view"}</h2>
          <p>{signedInScope==="school"&&plannedCount===0&&!requestedId ?
            "When you add courses to My Plan, their assigned resources will appear here automatically." :
            "Try a different course, term or search. You can also clear your course focus."}</p>
          {signedInScope==="school"&&!requestedId && <button type="button"
            onClick={()=>desk.setBookScope("all")}>Browse all books</button>}
          {requestedId && <button type="button" onClick={()=>router.push("/books")}>
            Clear course focus</button>}
        </div>}
      <p className="bk-preview-footnote">
        2027–28 curriculum preview. Book recommendations are not confirmed purchases.
      </p>
    </>}
  </div>;
}

export default function BooksPage() {
  return <Suspense fallback={<div className="bk-page"><BookOpen size={22}/>
    <p>Opening Book List…</p></div>}>
    <BookListContent/>
  </Suspense>;
}
