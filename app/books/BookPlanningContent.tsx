"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronRight, GraduationCap, PanelRightClose, PanelRightOpen, Wallet } from "lucide-react";
import catalog from "../courses/catalog-preview.json";
import { useDemoPlan } from "../components/DemoPlanContext";
import { usePlanningDesk } from "../components/PlanningDeskContext";

const courseById = new Map(catalog.courses.map(course => [course.id, course]));

/**
 * Book List mini and full planning use the SAME content and member selections.
 * Until the release-scoped resource catalog is approved and connected, this
 * shows real planned COURSE contexts but never fabricates book rows or prices.
 */
export default function BookPlanningContent({ variant = "portable" }: {
  variant?: "portable" | "full";
}) {
  const desk = usePlanningDesk();
  const plan = useDemoPlan();
  const [relatedOpen, setRelatedOpen] = useState(false);
  const plannedCourses = plan.courses.filter(course => course.stage === "planned")
    .flatMap(choice => {
      const course = courseById.get(choice.courseId);
      return course ? [course] : [];
    });

  const bookContent = <div className="bp-section">
    <header className="bp-section-heading">
      <h3>My School Books</h3>
      <span className="bp-subtle">2027–28</span>
    </header>
    <p className="bp-notice">
      Book assignments are not connected to this development preview yet.
      Your planned courses are shown below so you can see the future book-list structure.
      No resources are being marked as purchased or required.
    </p>
    {!plan.ready ? <p className="bp-empty">Loading your course selections…</p> :
      plannedCourses.length ? <div className="bp-course-groups" aria-label="Courses in My Plan">
        {plannedCourses.map(course => <div className="bp-course-entry" key={course.id}>
          <span className="bp-subtle">{course.subject}</span>
          <Link href={"/books?course=" + encodeURIComponent(course.id)}
            onClick={() => desk.setBookMode("browse")}>
            <span>{course.title}</span><ChevronRight size={15} aria-hidden="true" />
          </Link>
          <p>Book resources will appear here when their catalog assignments are ready.</p>
        </div>)}
      </div> : <div className="bp-empty">
        <p>Courses in My Plan will appear here. You can begin by planning a course.</p>
        <Link href="/courses" onClick={() => desk.setCourseMode("browse")}>
          Browse courses
        </Link>
      </div>}
    <div className="bp-library-summary">
      <BookOpen size={16} aria-hidden="true"/>
      <div><strong>My Library</strong><p>Owned and saved books will live here, separately from this school year's recommendations.</p></div>
    </div>
  </div>;

  const budgetContent = <div className="bp-section">
    <header className="bp-section-heading"><h3>Book Budget</h3><span className="bp-subtle">2027–28</span></header>
    <p className="bp-notice">This budget will follow the same school-book selections and filters as My Books.</p>
    <div className="bp-budget-item"><span>Estimated purchases</span><span>Not available yet</span></div>
    <div className="bp-budget-item"><span>Amount paid</span><span>Not available yet</span></div>
    <div className="bp-budget-item"><span>Remaining estimate</span><span>Not available yet</span></div>
    <p className="bp-help">We won't show $0 or calculate spending until book choices and actual costs are recorded. Ordered, paid, and received will remain separate.</p>
  </div>;

  if (variant === "portable") {
    return <div className="bp-mini-content">
      {desk.bookTab === "books" ? bookContent : budgetContent}
    </div>;
  }

  return <section className="bp-full" aria-label="Book Planning">
    <header className="bp-full-header">
      <div>
        <h2>Book Planning</h2>
        <p>Organize your books and explore their preparation and costs together.</p>
      </div>
      <div className="bp-focus-tabs" role="group" aria-label="Book Planning focus">
        <button type="button" className={desk.bookTab === "books" ? "is-active" : ""}
          aria-pressed={desk.bookTab === "books"} onClick={() => desk.setBookTab("books")}>
          <BookOpen size={15} /> My Books
        </button>
        <button type="button" className={desk.bookTab === "budget" ? "is-active" : ""}
          aria-pressed={desk.bookTab === "budget"} onClick={() => desk.setBookTab("budget")}>
          <Wallet size={15} /> Budget
        </button>
      </div>
    </header>
    <div className="bp-related-controls">
      <button type="button" aria-expanded={relatedOpen}
        onClick={() => setRelatedOpen(value => !value)}>
        {relatedOpen ? <PanelRightClose size={15}/> : <PanelRightOpen size={15}/>}
        {relatedOpen ? "Hide related information" : desk.bookTab === "books"
          ? "Show budget beside books" : "Show books beside budget"}
      </button>
    </div>
    <div className={"bp-full-layout" + (relatedOpen ? " has-related" : "")}>
      <div className="bp-primary" aria-label={desk.bookTab === "books" ? "My Books" : "Budget"}>
        {desk.bookTab === "books" ? bookContent : budgetContent}
      </div>
      {relatedOpen && <aside className="bp-related" aria-label="Related information">
        <header className="bp-related-header">
          {desk.bookTab === "books" ? <><Wallet size={16}/> Related budget</> :
            <><GraduationCap size={16}/> Related school books</>}
        </header>
        {desk.bookTab === "books" ? budgetContent : bookContent}
      </aside>}
    </div>
  </section>;
}
