"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap, PanelRightClose, PanelRightOpen, Wallet } from "lucide-react";
import courses from "../courses/catalog-preview.json";
import resources from "./catalog-resources-preview.json";
import { booksForMyPlan, bookNeededInTerm } from "./book-relationships.mjs";
import { buildBookSharedContexts } from "./book-shared-contexts.mjs";
import BookResourceRow from "./BookResourceRow";
import { useDemoPlan } from "../components/DemoPlanContext";
import { usePlanningDesk } from "../components/PlanningDeskContext";
import { usePlannerAuth } from "../components/PlannerAuthProvider";

const courseById = new Map(courses.courses.map(course => [course.id,course]));
const courseByEdition = new Map(courses.courses.map(course => [course.editionId,course]));
const sharedLocations=buildBookSharedContexts(resources,courses);

/** Shared mini/full book view: same member course decisions, not fake purchase data. */
export default function BookPlanningContent({ variant = "portable" }: {
  variant?: "portable" | "full";
}) {
  const desk = usePlanningDesk();
  const plan = useDemoPlan();
  const {status}=usePlannerAuth();
  const [relatedOpen,setRelatedOpen] = useState(false);
  const plannedCourses = plan.courses.filter(saved=>saved.stage==="planned")
    .flatMap(saved=>{const c=courseById.get(saved.courseId);return c?[c]:[];});
  const allSchoolBooks=useMemo(() =>
    booksForMyPlan(resources,courses,plan.courses,plan.students)
      .map(book=>({...book,sharedIn:sharedLocations.get(book.id)??[]})),
    [plan.courses,plan.students]);
  const schoolBooks=allSchoolBooks.filter(book=>bookNeededInTerm(book,desk.bookTerm));
  const groupMap=new Map<string,typeof schoolBooks>();
  for(const book of schoolBooks) {
    const context=book.uses.map(use=>courseByEdition.get(use.editionId))
      .filter(c=>Boolean(c)).sort((a,b)=>(a?.subjectSort??99)-(b?.subjectSort??99));
    const subject=context[0]?.subject??"Other resources";
    const entries=groupMap.get(subject)??[];entries.push(book);groupMap.set(subject,entries);
  }
  const grouped=[...groupMap.entries()].sort((a,b)=>
    (courses.courses.find(c=>c.subject===a[0])?.subjectSort??99)-
    (courses.courses.find(c=>c.subject===b[0])?.subjectSort??99));

  const bookContent=<div className="bp-section">
    <header className="bp-section-heading">
      <h3>My School Books</h3>
      <span className="bp-subtle">{schoolBooks.length} {schoolBooks.length===1?"resource":"resources"}</span>
    </header>
    <p className="bp-help">Books recommended by the courses and topics in My Plan.
      These are suggestions to review, not confirmed purchases.</p>
    {!plan.ready ? <p className="bp-empty">Loading your course selections…</p> :
      !plannedCourses.length ? <div className="bp-empty">
        <p>As you add courses to My Plan, their recommended books will appear here automatically.</p>
        <Link href="/courses" onClick={()=>desk.setCourseMode("browse")}>Browse courses</Link>
      </div> : grouped.length ? <div className="bp-course-groups">
        {grouped.map(([subject,books])=><section key={subject} className="bp-book-subject">
          <h4>{subject}</h4>
          {books.map(book=><BookResourceRow key={book.id} book={book}
            density={variant==="full" ? desk.bookDetails : "compact"}
            courseByEdition={courseByEdition} mini={variant==="portable"}
            memberView={status==="signed-in"}/>)}
        </section>)}
      </div> : <p className="bp-empty">No assigned books match this term.
        You can choose another term to see more resources.</p>}
    <div className="bp-library-summary">
      <BookOpen size={16} aria-hidden="true"/>
      <div><strong>My Library — Coming later</strong>
        <p>Owned and saved resources will be separate from your annual school recommendations.</p>
      </div>
    </div>
  </div>;

  const budgetContent=<div className="bp-section">
    <header className="bp-section-heading"><h3>Book Budget</h3>
      <span className="bp-subtle">{desk.bookTerm==="all"?"All terms":"Term "+desk.bookTerm}</span>
    </header>
    <p className="bp-notice">This view follows the same school-book and term selection as My Books.</p>
    <div className="bp-budget-item"><span>Resources in this view</span>
      <strong>{schoolBooks.length}</strong></div>
    <div className="bp-budget-item"><span>Estimated purchases</span>
      <span>Not entered yet</span></div>
    <div className="bp-budget-item"><span>Amount paid</span>
      <span>Not entered yet</span></div>
    <div className="bp-budget-item"><span>Remaining estimate</span>
      <span>Not available yet</span></div>
    <p className="bp-help">We won't show $0 or count anything as a purchase
      until you've chosen how to obtain these books and recorded the relevant costs.
      A book used in two courses is still one resource in this list.</p>
  </div>;

  const termControl=<label className="bp-term-filter">Show resources for
    <select value={desk.bookTerm}
      onChange={e=>desk.setBookTerm(e.target.value as typeof desk.bookTerm)}>
      <option value="all">All terms</option>
      <option value="1">Term 1</option>
      <option value="2">Term 2</option>
      <option value="3">Term 3</option>
    </select>
  </label>;

  if(variant==="portable")return <div className="bp-mini-content">
    {termControl}
    {desk.bookTab==="books"?bookContent:budgetContent}
    <Link className="bp-open-list" href="/books"
      onClick={()=>{desk.setBookScope("school");desk.setBookMode("browse");}}>
      View My School Books in the list <ChevronRight size={14}/>
    </Link>
  </div>;

  return <section className="bp-full" aria-label="Book Planning">
    <header className="bp-full-header">
      <div>
        <h2>Book Planning</h2>
        <p>See your actual school book recommendations and change the emphasis without losing them.</p>
      </div>
      <div className="bp-focus-tabs" role="group" aria-label="Book Planning focus">
        <button type="button" className={desk.bookTab==="books"?"is-active":""}
          aria-pressed={desk.bookTab==="books"} onClick={()=>desk.setBookTab("books")}>
          <BookOpen size={15}/> My Books
        </button>
        <button type="button" className={desk.bookTab==="budget"?"is-active":""}
          aria-pressed={desk.bookTab==="budget"} onClick={()=>desk.setBookTab("budget")}>
          <Wallet size={15}/> Budget
        </button>
      </div>
    </header>
    {termControl}
    <div className="bp-related-controls">
      <button type="button" aria-expanded={relatedOpen}
        onClick={()=>setRelatedOpen(open=>!open)}>
        {relatedOpen?<PanelRightClose size={15}/>:<PanelRightOpen size={15}/>}
        {relatedOpen?"Hide related information":
          desk.bookTab==="books"?"Show budget beside books":"Show books beside budget"}
      </button>
    </div>
    <div className={"bp-full-layout"+(relatedOpen?" has-related":"")}>
      <div className="bp-primary" aria-label={desk.bookTab==="books"?"My Books":"Budget"}>
        {desk.bookTab==="books"?bookContent:budgetContent}
      </div>
      {relatedOpen && <aside className="bp-related" aria-label="Related information">
        <header className="bp-related-header">
          {desk.bookTab==="books"?<><Wallet size={16}/> Related budget</>:
            <><GraduationCap size={16}/> Related school books</>}
        </header>
        {desk.bookTab==="books"?budgetContent:bookContent}
      </aside>}
    </div>
  </section>;
}
