"use client";

import { ChevronRight } from "lucide-react";
import BookResourceRow from "./BookResourceRow";
import type {GroupedBookCourses,CourseContext} from "./book-course-groups.mjs";

type Density = "compact"|"topics"|"detailed";

/** Subjects stay in view, courses reveal their topics, books stay directly
 * beneath their assigned context. Native details preserve keyboard access. */
export default function BookCourseHierarchy({
  grouped,density,courseByEdition,openCourses=false,
}:{
  grouped:GroupedBookCourses;
  density:Density;
  courseByEdition:Map<string,CourseContext>;
  openCourses?:boolean;
}) {
  return <div className="bk-book-sections bk-course-hierarchy" aria-label="Books by subject, course and topic">
    {grouped.sections.map(section=><section key={section.subject} className="bk-book-subject">
      <div className="bk-subject-heading">
        <h2>{section.subject}</h2>
        <span>{section.courses.length} {section.courses.length===1?"course":"courses"}</span>
      </div>
      <div className="bk-course-list">
        {section.courses.map(group=><details key={group.course.id}
          className="bk-course-group" open={undefined} defaultOpen={openCourses}>
          <summary>
            <ChevronRight size={16} className="bk-tree-chevron" aria-hidden="true"/>
            <span className="bk-course-title">{group.course.title}</span>
            <span className="bk-course-grade">{group.course.gradeDisplay}</span>
            <span className="bk-tree-count">{group.count} {group.count===1?"resource":"resources"}</span>
          </summary>
          <div className="bk-course-contents">
            {group.directBooks.length>0 && <div className="bk-course-direct">
              {group.topics.length>0 && <p className="bk-course-direct-label">Course resources</p>}
              {group.directBooks.map(book=><BookResourceRow key={book.id}
                book={book} density={density} courseByEdition={courseByEdition}
                showLocation={false}/>)}
            </div>}
            {group.topics.map(topic=><details key={topic.topic.id}
              className="bk-topic-group" defaultOpen={true}>
              <summary>
                <ChevronRight size={14} className="bk-tree-chevron" aria-hidden="true"/>
                <span className="bk-topic-title">{topic.topic.title}</span>
                <span className="bk-tree-count">{topic.books.length}
                  {topic.books.length===1?" resource":" resources"}</span>
              </summary>
              <div className="bk-topic-books">
                {topic.books.map(book=><BookResourceRow key={book.id}
                  book={book} density={density} courseByEdition={courseByEdition}
                  showLocation={false}/>)}
              </div>
            </details>)}
          </div>
        </details>)}
      </div>
    </section>)}
  </div>;
}
