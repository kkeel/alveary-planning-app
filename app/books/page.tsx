"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlignJustify, ArrowLeft, BookOpen, BookOpenText, CheckCircle2, List, ListTree, NotebookPen, Search } from "lucide-react";
import courses from "../courses/catalog-preview.json";
import resources from "./catalog-resources-preview.json";
import { buildBookCourseGroups, booksFromCourseGroups } from "./book-course-groups.mjs";
import BookCourseHierarchy from "./BookCourseHierarchy";
import BookResourceRow from "./BookResourceRow";
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
  const plannedCount=plan.courses.filter(choice=>choice.stage==="planned").length;

  // A single presentation source serves both views. Crucially the course
  // hierarchy filters the EXACT edition-level assignment before displaying it.
  // By Book then deduplicates only the rendered, already-filtered contexts.
  const grouped=useMemo(()=>buildBookCourseGroups(resources,courses,{
    scope:requestedId?"all":signedInScope,
    savedCourses:plan.courses,
    students:plan.students,
    subject,grades:desk.grades,country:desk.country,query,term,
    focusCourseId:focusError?"unknown-course-focus":requestedId,
    focusTopicId:validTopic?.id??null,
  }),[signedInScope,plan.courses,plan.students,subject,desk.grades,
    desk.country,query,term,requestedId,validTopic?.id,focusError]);
  const alphabeticalBooks=useMemo(()=>booksFromCourseGroups(grouped),[grouped]);
  const byCourse=desk.bookOrganize==="course";

  const density=desk.bookDetails;
  const changeDensity=(next:typeof density)=>desk.setBookDetails(next);
  const hasCourseFilters=desk.grades.length>0||desk.country!=="all";

  return <div className="bk-page">
    <header className="bk-heading">
      <h1>{signedIn && mode==="plan"?"Book Planning":
        signedIn?"Book List":"Explore Books"}</h1>
      <p>{mode==="plan"
        ?"Keep your school books, preparation and budget connected."
        :"Discover Alveary resources, see where they fit, and gather the books your family needs."}</p>
    </header>
    {signedIn && <div className="bk-toolbar" aria-label="Book List views">
      <div className="bk-mode-switch" role="group" aria-label="Book views">
        <button type="button" className={mode==="browse"?"is-current":""}
          aria-pressed={mode==="browse"} onClick={()=>desk.setBookMode("browse")}>
          <List size={14}/> List
        </button>
        <button type="button" className={mode==="plan"?"is-current":""}
          aria-pressed={mode==="plan"} onClick={()=>desk.setBookMode("plan")}>
          <NotebookPen size={14}/> Planning
        </button>
      </div>
      <Link className="bk-back-link" href="/courses"
        onClick={()=>desk.setCourseMode("browse")}>
        <ArrowLeft size={14}/> Course List
      </Link>
    </div>}

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

      <div className="bk-catalog-toolbar" aria-label="Browse book catalog">
        <div className="bk-catalog-primary">
          {signedIn&&!requestedId && <div className="bk-scope-switch" role="group" aria-label="Which books to show">
            <button type="button" aria-pressed={desk.bookScope==="all"}
              className={desk.bookScope==="all"?"is-current":""}
              onClick={()=>desk.setBookScope("all")}>All Books</button>
            <button type="button" aria-pressed={desk.bookScope==="school"}
              className={desk.bookScope==="school"?"is-current":""}
              onClick={()=>desk.setBookScope("school")}>My School Books</button>
          </div>}
          <label className="bk-course-search">
            <Search size={15} aria-hidden="true"/>
            <span className="sr-only">Search books</span>
            <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
              placeholder="Search books, courses, or topics"/>
          </label>
        </div>
        <div className="bk-catalog-secondary">
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
          <div className="bk-view-choices">
            <div className="bk-organize" role="group" aria-label="Organize Book List">
              <span className="bk-view-label">Organize</span>
              <div className="bk-organize-switch">
                <button type="button" className={byCourse?"is-current":""}
                  aria-pressed={byCourse} onClick={()=>desk.setBookOrganize("course")}>
                  By Course
                </button>
                <button type="button" className={!byCourse?"is-current":""}
                  aria-pressed={!byCourse} onClick={()=>desk.setBookOrganize("book")}>
                  By Book
                </button>
              </div>
            </div>
          <div className="bk-display-switch" role="group" aria-label="Book List display density">
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
          </div>
          </div>
        </div>
      </div>

      {!requestedId && <div className="bk-scope-context" role="status">
        <div className="bk-scope-context-label">
          {signedInScope==="school" ? <CheckCircle2 size={16} aria-hidden="true"/> :
            <BookOpen size={16} aria-hidden="true"/>}
          <strong>{signedInScope==="school" ? "Showing books from My Plan" :
            "Browsing the Alveary book catalog"}</strong>
        </div>
        <p>{signedInScope==="school" ?
          plannedCount
            ? "Resources assigned to your "+plannedCount+" planned "+(plannedCount===1?"course":"courses")+
              " and their included topics. Books used in multiple courses can appear more than once."
            : "You haven't added any courses to My Plan yet. Browse courses or explore all books." :
          "These books come from the 2027–28 draft curriculum, including courses outside your plan."}</p>
        {signedIn && <button type="button" onClick={()=>desk.setBookScope(
          signedInScope==="school"?"all":"school")}>
          {signedInScope==="school"?"Browse all books":"See My School Books"}
        </button>}
      </div>}

      <p className="bk-results-note">
        {grouped.distinctResources} distinct {grouped.distinctResources===1?"book/resource":"books/resources"}
        {byCourse ? " across "+grouped.appearances+
          " course/topic "+(grouped.appearances===1?"placement":"placements") : ""}
        {requestedId ? " for this focused course/topic" :
          signedInScope==="school" ? " from My Plan" : " in the 2027–28 draft"}.
        {signedInScope==="school"&&!requestedId ?
          " Recommendations are not confirmed purchases." : ""}
      </p>
      {grouped.sections.length ? byCourse ?
        <BookCourseHierarchy
          key={[signedInScope,requestedId,validTopic?.id,query,term,subject,
            desk.grades.join(","),desk.country].join("|")}
          grouped={grouped} density={density} courseByEdition={coursesByEdition}
          openCourses={signedInScope==="school"||Boolean(requestedId)||
            Boolean(query.trim())||Boolean(subject)}/>
        : <div className="bk-alphabetical-list" aria-label="Books in alphabetical order">
          {alphabeticalBooks.map(book=><BookResourceRow key={book.id} book={book}
            density={density} courseByEdition={coursesByEdition}/>)}
        </div>
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
        Draft 2027–28 resource preview. Member-only resources remain listed, but their
        external links are omitted in public browsing. Personal ownership and budget tracking
        are still being developed.
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
