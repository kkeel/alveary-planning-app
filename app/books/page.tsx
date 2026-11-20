"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, BookOpen, ChevronRight, List, NotebookPen, Search } from "lucide-react";
import catalog from "../courses/catalog-preview.json";
import PlanningDesk from "../components/PlanningDesk";
import { usePlanningDesk } from "../components/PlanningDeskContext";
import { usePlannerAuth } from "../components/PlannerAuthProvider";
import "./book-planning.css";

const coursesById = new Map(catalog.courses.map(course => [course.id, course]));
const coursesByEdition = new Map(catalog.courses.map(course => [course.editionId, course]));
const linkedTopics = new Map<string, (typeof catalog.courses)[number][]>();
for (const link of catalog.topicLinks) {
  const topic = coursesByEdition.get(link.childEditionId);
  if (!topic) continue;
  const siblings = linkedTopics.get(link.parentEditionId) ?? [];
  if (!siblings.some(candidate => candidate.id === topic.id)) siblings.push(topic);
  linkedTopics.set(link.parentEditionId, siblings);
}

function BookListContent() {
  const desk = usePlanningDesk();
  const { status } = usePlannerAuth();
  const signedIn = status === "signed-in";
  const params = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const mode = signedIn ? desk.bookMode : "browse";

  // Existing View Books links use ?course=canonicalPlanId. Topic links now pass
  // both ?course=parentCourseId&topic=topicPlanId so a shared topic's original
  // course/edition context survives navigation.
  const requestedId = params.get("course");
  const requestedTopicId = params.get("topic");
  const lastFocus = useRef<string | null>(null);
  // A View Books deep link opens List, but the member can then deliberately
  // switch to full Planning without having that choice immediately undone.
  useEffect(() => {
    const focusKey = requestedId ? requestedId + ":" + (requestedTopicId ?? "") : null;
    if (focusKey && lastFocus.current !== focusKey && signedIn) {
      lastFocus.current = focusKey;
      desk.setBookMode("browse");
    }
    if (!focusKey) lastFocus.current = null;
  }, [requestedId, requestedTopicId, signedIn, desk]);
  const requested = requestedId ? coursesById.get(requestedId) : undefined;
  const parent = requested && requested.type !== "Topic" ? requested : undefined;
  const topicOnly = requested && requested.type === "Topic" ? requested : undefined;
  const childTopics = parent ? (linkedTopics.get(parent.editionId) ?? []) : [];
  const validTopic = requestedTopicId && childTopics.some(topic => topic.id === requestedTopicId)
    ? childTopics.find(topic => topic.id === requestedTopicId) : undefined;
  const focusError = Boolean((requestedId && !requested) ||
    (requestedTopicId && !validTopic));
  const focus = focusError ? undefined : validTopic ?? parent ?? topicOnly;
  const focusedTopics = validTopic ? [validTopic] : childTopics;
  const parentContexts = topicOnly
    ? catalog.topicLinks
      .filter(link => link.childEditionId === topicOnly.editionId)
      .flatMap(link => {
        const course = coursesByEdition.get(link.parentEditionId);
        return course ? [course] : [];
      })
    : [];

  // This is a real, searchable index of existing course contexts, not a book
  // catalog. Do not call these entries book recommendations before the
  // approved Resource Assignment snapshot is connected.
  const courseIndex = useMemo(() => catalog.courses
    .filter(course => course.type !== "Topic")
    .filter(course => !query.trim() ||
      [course.title, course.subject, course.gradeDisplay ?? ""]
        .join(" ").toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a, b) => a.presentationSort.localeCompare(b.presentationSort))
    .slice(0, 30), [query]);

  function clearFocus() { router.push("/books"); }

  return <div className="bk-page">
    <header className="bk-heading">
      <h1>{signedIn && mode === "plan" ? "Book Planning" :
        signedIn ? "Book List" : "Explore Books"}</h1>
      <p>{signedIn && mode === "plan"
        ? "Keep your school books, preparation and budget connected."
        : "Explore Alveary books and the courses where they belong. The 2027–28 book catalog is being prepared."}</p>
    </header>

    {signedIn && <div className="bk-toolbar" aria-label="Book List views">
      <div className="cx-mode-switch" role="group" aria-label="Book views">
        <button type="button" className={mode === "browse" ? "is-current" : ""}
          aria-pressed={mode === "browse"} onClick={() => desk.setBookMode("browse")}>
          <List size={14} aria-hidden="true"/> List
        </button>
        <button type="button" className={mode === "plan" ? "is-current" : ""}
          aria-pressed={mode === "plan"} onClick={() => desk.setBookMode("plan")}>
          <NotebookPen size={14} aria-hidden="true"/> Planning
        </button>
      </div>
      <Link className="bk-back-link" href="/courses"
        onClick={() => desk.setCourseMode("browse")}>
        <ArrowLeft size={14} aria-hidden="true"/> Course List
      </Link>
    </div>}

    {mode === "plan" ? <PlanningDesk variant="full" /> : <>
      {requestedId && <section className="bk-focused" aria-label="Book List course focus">
        <div className="bk-focused-header">
          <h2>{focusError ? "Course or topic focus unavailable" :
            <>Viewing book context for: {focus?.title}</>}</h2>
          <button type="button" onClick={clearFocus}>Clear focus</button>
        </div>
        {focusError ? <p>This link doesn't match a course/topic relationship in the 2027–28 preview catalog.
          You can clear it and continue browsing.</p> : <>
          <p>{parent?.subject ?? topicOnly?.subject}
            {parent && validTopic && <> · From {parent.title}</>}
            {parent?.gradeDisplay && <> · {parent.gradeDisplay}</>}</p>
          {focusedTopics.length > 0 && <ul className="bk-context-list">
            {focusedTopics.map(topic => <li key={topic.id}>{topic.title}</li>)}
          </ul>}
          {topicOnly && parentContexts.length > 0 && <p>Also connected to: {parentContexts.map(c => c.title).join("; ")}.
            The same topic can be used in more than one course.</p>}
          <p>Resource assignments for this exact course/topic will appear here after the book catalog is connected.</p>
        </>}
        <Link href="/courses" onClick={() => desk.setCourseMode("browse")}>
          <ArrowLeft size={13} aria-hidden="true"/> Return to Course List
        </Link>
      </section>}

      <section className="bk-notice" aria-label="Book catalog status">
        <h2>Book catalog preview is being connected</h2>
        <p>The Course List is already using the 2027–28 course/edition snapshot.
          Book titles, purchase links, rationales, and resource assignments have not yet
          been published to this app. We won't show incomplete lists as though they were your book requirements.</p>
        <p>For now, browse the course contexts below, or open Planning to see the
          structure that will organize your school books and budget.</p>
      </section>

      {!requestedId && <section className="bk-context-browser" aria-label="Course contexts for future book browsing">
        <h2>Find a course or topic context</h2>
        <label className="bk-course-search">
          <Search size={15} aria-hidden="true"/>
          <span className="sr-only">Search courses</span>
          <input type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Search the course index" />
        </label>
        <div className="bk-course-index">
          {courseIndex.map(course => <Link key={course.id}
            href={"/books?course=" + encodeURIComponent(course.id)}>
            <span><span className="bk-subject-name">{course.subject}</span>{course.title}</span>
            <ChevronRight size={15} aria-hidden="true"/>
          </Link>)}
          {!courseIndex.length && <p>No course contexts match this search.</p>}
        </div>
        <p className="bp-help">This is a temporary course-context index, not the finished Book List.</p>
      </section>}
    </>}
  </div>;
}

export default function BooksPage() {
  return <Suspense fallback={<div className="bk-page"><BookOpen size={22} aria-hidden="true"/>
    <p>Opening Book List…</p></div>}>
    <BookListContent/>
  </Suspense>;
}
