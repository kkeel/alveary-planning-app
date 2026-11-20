"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink } from "lucide-react";
import type { ResourceBook } from "./book-relationships.mjs";
import { bookTermSummary } from "./book-relationships.mjs";

type Density = "compact" | "topics" | "detailed";
type CourseLabel = { title:string; subject:string };
export default function BookResourceRow({
  book, density, courseByEdition, mini = false,
}: {
  book: ResourceBook;
  density: Density;
  courseByEdition: Map<string,CourseLabel>;
  mini?: boolean;
}) {
  const [opened,setOpened] = useState<boolean | null>(null);
  useEffect(() => setOpened(null),[density]);
  const showMeta = opened === null ? density !== "compact" : opened;
  const showDetails = opened === null ? density === "detailed" : opened;
  const locations = [...new Map(book.uses.map(use => {
    const course = courseByEdition.get(use.editionId);
    return [use.editionId, course ? course.title : "Course resource"];
  })).values()];
  const chooseOne = book.uses.some(use => use.chooseOne);
  const optional = book.uses.some(use => use.optional);
  // Defense in depth: if a source record is member-only, not even a link-level
  // misconfiguration should render external URLs in public-safe Book Explorer.
  const visibleLinks = book.memberOnly ? [] : book.links.filter(link =>
    /^https:\/\//.test(link.url));
  return <article className={"bk-book-row" + (mini ? " is-mini" : "")}>
    <div className="bk-book-heading">
      <button type="button" className="bk-book-expand" aria-expanded={showMeta}
        onClick={() => setOpened(v => !(v === null ? density !== "compact" : v))}>
        {showMeta ? <ChevronDown size={15} aria-hidden="true"/> :
          <ChevronRight size={15} aria-hidden="true"/>}
        <span className="bk-book-heading-text">
          <strong>{book.title}</strong>
          {!mini && book.author && <span>{book.author}</span>}
        </span>
      </button>
      {book.memberOnly && <span className="bk-book-restricted">Member resource</span>}
    </div>
    {showMeta && <div className="bk-book-description">
      <div className="bk-book-meta">
        <span>{bookTermSummary(book)}</span>
        {optional && <span>Optional in some uses</span>}
        {chooseOne && <span>One of several options</span>}
        {!mini && locations.length > 0 && <span>{locations.slice(0,2).join(" · ")}
          {locations.length>2 ? " +"+(locations.length-2)+" more" : ""}</span>}
      </div>
      {showDetails && <>
        {book.rationale && <p className="bk-book-rationale">{book.rationale}</p>}
        {book.isbn && <p className="bk-book-isbn">ISBN/ASIN: {book.isbn}</p>}
        {!mini && book.uses.length > 0 && <div className="bk-book-usages">
          <strong>Alveary course/topic connections</strong>
          <span>{locations.join(" · ")}</span>
        </div>}
      </>}
      {visibleLinks.length > 0 ? <div className="bk-book-links">
        {visibleLinks.map((link,i) =>
          <a key={i} href={link.url} target="_blank" rel="noopener noreferrer">
            <ExternalLink size={13} aria-hidden="true"/>{link.label}
          </a>)}
      </div> : book.memberOnly ? <p className="bk-book-member-note">
        Resource links are not available in public browsing.
      </p> : !mini ? <p className="bk-book-member-note">No public resource link listed.</p> : null}
    </div>}
  </article>;
}
