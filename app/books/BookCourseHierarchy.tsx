"use client";

import { useState, type ReactNode } from "react";
import BookResourceRow from "./BookResourceRow";
import type {GroupedBookCourses,CourseContext} from "./book-course-groups.mjs";
import type {ResourceBook} from "./book-relationships.mjs";

type Density = "compact"|"topics"|"detailed";

/** Native summary remains keyboard-friendly; React remembers whether the
 * member expanded or collapsed this course/topic while they work. */
function Disclosure({
  startOpen,className,summary,children,
}:{
  startOpen:boolean;className:string;summary:ReactNode;children:ReactNode;
}) {
  const [open,setOpen]=useState(startOpen);
  return <details className={className} open={open}
    onToggle={event=>setOpen(event.currentTarget.open)}>
    <summary>{summary}</summary>
    {children}
  </details>;
}

/** Subject headings remain visible. Courses reveal their topic assignments,
 * with no redundant Topic layer for a Single-Topic Course. */
export default function BookCourseHierarchy({
  grouped,density,courseByEdition,openCourses=false,
}:{
  grouped:GroupedBookCourses;
  density:Density;
  courseByEdition:Map<string,CourseContext>;
  openCourses?:boolean;
}) {
  const renderBooks=(books:ResourceBook[])=>{
    const placed=new Set<string>();
    return books.flatMap(book=>{
      if(placed.has(book.id))return [];
      const linkedChoice=book.uses.find(use=>use.chooseOne &&
        books.some(other=>other.id!==book.id &&
          other.uses.some(candidate=>candidate.assignmentId===use.assignmentId)));
      if(linkedChoice){
        const alternatives=books.filter(other=>other.uses.some(use=>
          use.assignmentId===linkedChoice.assignmentId));
        alternatives.forEach(option=>placed.add(option.id));
        return [<div className="bk-choice-group" key={"choice-"+linkedChoice.assignmentId}>
          <div className="bk-choice-heading">
            <span className="bk-book-flag is-choice">CHOOSE ONE</span>
            <div>
              <strong>Choose one book from these alternatives</strong>
              <p>{alternatives.map(item=>item.title).join(" or ")}</p>
            </div>
          </div>
          <div className="bk-choice-books">
            {alternatives.map(item=><BookResourceRow key={item.id}
              book={item} density={density} courseByEdition={courseByEdition}
              showLocation={false} groupedChoice/>)}
          </div>
        </div>];
      }
      placed.add(book.id);
      return [<BookResourceRow key={book.id} book={book} density={density}
        courseByEdition={courseByEdition} showLocation={false}/>];
    });
  };
  return <div className="bk-book-sections bk-course-hierarchy" aria-label="Books by subject, course and topic">
    {grouped.sections.map(section=><section key={section.subject} className="bk-book-subject">
      <div className="bk-subject-heading">
        <h2>{section.subject}</h2>
      </div>
      <div className="bk-course-list">
        {section.courses.map(group=><Disclosure key={group.course.id}
          className="bk-course-group" startOpen={openCourses}
          summary={<>
            <span className="bk-course-title">{group.course.title}</span>
            <span className="bk-course-meta">
              {group.course.gradeDisplay && <span className="bk-course-grade">
                {group.course.gradeDisplay}
              </span>}
              {group.course.type!=="Combined Course" && <>
                {group.course.gradeDisplay && <span className="bk-course-meta-divider" aria-hidden="true">|</span>}
                <span className="bk-tree-count">{group.count} {group.count===1?"resource":"resources"}</span>
              </>}
            </span>
          </>}>
          <div className="bk-course-contents">
            {group.directBooks.length>0 && <div className="bk-course-direct">
              {group.topics.length>0 && <p className="bk-course-direct-label">Course resources</p>}
              {renderBooks(group.directBooks)}
            </div>}
            {group.topics.map(topic=><Disclosure key={topic.topic.id}
              className="bk-topic-group" startOpen={true}
              summary={<>
                <span className="bk-topic-title">{topic.topic.title}</span>
                <span className="bk-tree-count">{topic.books.length}
                  {topic.books.length===1?" resource":" resources"}</span>
              </>}>
              <div className="bk-topic-books">
                {renderBooks(topic.books)}
              </div>
            </Disclosure>)}
          </div>
        </Disclosure>)}
      </div>
    </section>)}
  </div>;
}
