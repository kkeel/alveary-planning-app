"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AlignJustify, ArrowLeft, BookOpen, BookOpenText, List, ListTree, NotebookPen, Search } from "lucide-react";
import courses from "../courses/catalog-preview.json";
import resources from "./catalog-resources-preview.json";
import { allBooks, booksForFocus, booksForMyPlan, bookNeededInTerm } from "./book-relationships.mjs";
import { matchesCountry } from "../courses/country-filter.mjs";
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
const draftBooks = allBooks(resources);

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
  const focusBooks = requested && !focusError
    ? booksForFocus(resources,courses,requested.id,validTopic?.id??null) : [];
  const schoolBooks = useMemo(() =>
    booksForMyPlan(resources,courses,plan.courses,plan.students),
    [plan.courses,plan.students]);
  const baseBooks = requestedId ? focusBooks :
    signedIn && desk.bookScope==="school" ? schoolBooks : draftBooks;
  const filtered = baseBooks.filter(book => {
    if(query.trim()) {
      const search=(book.title+" "+(book.author??"")+" "+(book.isbn??"")).toLowerCase();
      if(!search.includes(query.trim().toLowerCase()))return false;
    }
    if(!bookNeededInTerm(book,term))return false;
    if(requestedId)return true; // Focus explicitly overrides unrelated grade/subject filters.
    return book.uses.some(use => {
      const source=coursesByEdition.get(use.editionId);
      if(!source)return false;
      if(subject && source.subject!==subject)return false;
      if(desk.grades.length && !source.grades.some(g=>desk.grades.includes(g)))return false;
      if(!matchesCountry(source.country,desk.country))return false;
      return true;
    });
  });

  const groups=new Map<string,typeof filtered>();
  for(const book of filtered) {
    const sources=book.uses.map(use=>coursesByEdition.get(use.editionId)).filter(c=>Boolean(c));
    const primary=subject && !requestedId ? subject :
      sources.sort((a,b)=>(a?.subjectSort??99)-(b?.subjectSort??99))[0]?.subject??"Other resources";
    const list=groups.get(primary)??[];
    list.push(book);groups.set(primary,list);
  }
  const orderedGroups=[...groups.entries()].sort((a,b)=>
    courseSubjects.indexOf(a[0])-courseSubjects.indexOf(b[0]));

  const density=desk.bookDetails;
  const changeDensity=(next:typeof density)=>desk.setBookDetails(next);
  const hasCourseFilters=desk.grades.length>0||desk.country!=="all";

  return <div className="bk-page">
    <header className="bk-heading">
      <h1>{signedIn && mode==="plan"?"Book Planning":
        signedIn?"Book List":"Explore Books"}</h1>
      <p>{mode==="plan"
        ?"Keep your school books, preparation and budget connected."
        :"Browse books and supporting resources from the draft 2027–28 Alveary curriculum. Your own book choices stay separate from the full catalog."}</p>
    </header>
    {signedIn && <div className="bk-toolbar" aria-label="Book List views">
      <div className="cx-mode-switch" role="group" aria-label="Book views">
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
        <div className="bk-catalog-controls">
          {signedIn&&!requestedId && <div className="bk-scope-switch" role="group" aria-label="Which books to show">
            <button type="button" aria-pressed={desk.bookScope==="all"}
              className={desk.bookScope==="all"?"is-current":""}
              onClick={()=>desk.setBookScope("all")}>All Alveary Books</button>
            <button type="button" aria-pressed={desk.bookScope==="school"}
              className={desk.bookScope==="school"?"is-current":""}
              onClick={()=>desk.setBookScope("school")}>My School Books</button>
          </div>}
          <label className="bk-course-search">
            <Search size={15} aria-hidden="true"/>
            <span className="sr-only">Search books</span>
            <input type="search" value={query} onChange={event=>setQuery(event.target.value)}
              placeholder="Search books, authors, ISBNs"/>
          </label>
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
        </div>
        <div className="pd-detail-switch" role="group" aria-label="Book List display density">
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

      {!requestedId && hasCourseFilters && <div className="bk-filter-note">
        Using your Course List grade/country filters.
        <button type="button" onClick={()=>{desk.setGrades([]);desk.setCountry("all");}}>
          Show all grades and countries
        </button>
      </div>}
      <p className="bk-results-note">{filtered.length} {filtered.length===1?"resource":"distinct resources"} shown
        {requestedId?" in this course/topic focus":
          signedIn&&desk.bookScope==="school"?" from My Plan":" in the 2027–28 draft catalog"}.
        {signedIn&&desk.bookScope==="school"&&!requestedId?
          " These are curriculum suggestions, not confirmed purchases." : ""}
      </p>
      {orderedGroups.length ? <div className="bk-book-sections">
        {orderedGroups.map(([group,bookRows])=><section key={group} className="bk-book-subject">
          <h2>{group}</h2>
          <div className="bk-book-rows">
            {bookRows.map(book=><BookResourceRow key={book.id} book={book}
              density={density} courseByEdition={coursesByEdition}/>)}
          </div>
        </section>)}
      </div> : <div className="bk-notice">
        <h2>No books match this view</h2>
        <p>Try changing the search, term, or subject. You can also clear a selected course focus.</p>
        {requestedId && <button type="button" onClick={()=>router.push("/books")}>Show all books</button>}
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
