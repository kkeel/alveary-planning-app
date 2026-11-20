"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, ExternalLink, LockKeyhole } from "lucide-react";
import type { ResourceBook } from "./book-relationships.mjs";
import { bookTermSummary } from "./book-relationships.mjs";
import covers from "./book-cover-map.json";

type Density = "compact" | "topics" | "detailed";
type CourseLabel = { title:string; subject:string };

function ResourceCover({ book, mini }: { book:ResourceBook; mini:boolean }) {
  const [failed,setFailed] = useState(false);
  const legacyId = (covers.legacyResourceIds as Record<string,string>)[book.id];
  // Airtable-sourced covers copied into this app's own GitHub Pages assets
  // supersede the previous year's immutable GitHub thumbnail when available.
  const local = (covers.newCoverIds as string[]).includes(book.id);
  const src = local ? "/book-covers/" + encodeURIComponent(book.id) + ".webp"
    : legacyId ? covers.imageBase + encodeURIComponent(legacyId) + ".webp" : null;
  return <span className={"bk-cover" + (mini ? " is-mini" : "")} aria-hidden="true">
    {src && !failed ? <img src={src} alt="" loading="lazy"
      decoding="async" onError={()=>setFailed(true)} /> :
      <BookOpen size={mini ? 17 : 27} strokeWidth={1.35}/>}
  </span>;
}

/** Cover-led book list: familiar title, author, rationale and purchase options,
 * with the same expand-on-click behavior as the Course List. */
export default function BookResourceRow({
  book, density, courseByEdition, mini = false, showLocation = true,
}: {
  book: ResourceBook;
  density: Density;
  courseByEdition: Map<string,CourseLabel>;
  mini?: boolean;
  showLocation?: boolean;
}) {
  const [opened,setOpened] = useState<boolean | null>(null);
  useEffect(() => setOpened(null),[density]);
  const defaultDetails = density === "detailed";
  const showDetails = opened ?? defaultDetails;
  const showSummary = density !== "compact" && !mini || showDetails;
  const locations = [...new Map(book.uses.map(use => {
    const course = courseByEdition.get(use.editionId);
    return [use.editionId, course ? course.title : "Course resource"];
  })).values()];
  const chooseOne = book.uses.some(use => use.chooseOne);
  const optional = book.uses.some(use => use.optional);
  // Defense in depth: restricted resources must not expose external URLs,
  // even if a link-level flag was accidentally overlooked.
  const visibleLinks = book.memberOnly ? [] : book.links.filter(link =>
    /^https:\/\//.test(link.url));
  const role = [...new Set(book.uses.map(use => use.role).filter(Boolean))].join(" · ");

  return <article className={"bk-book-row" + (mini ? " is-mini" : "")}>
    <div className="bk-book-line">
      <ResourceCover book={book} mini={mini}/>
      <div className="bk-book-main">
        <div className="bk-book-heading">
          <button type="button" className="bk-book-expand" aria-expanded={showDetails}
            aria-label={(showDetails ? "Hide" : "Show") + " full details for " + book.title}
            onClick={() => setOpened(value => !(value ?? defaultDetails))}>
            {showDetails ? <ChevronDown size={15} aria-hidden="true"/> :
              <ChevronRight size={15} aria-hidden="true"/>}
            <span className="bk-book-heading-text">
              <strong>{book.title}</strong>
              {!mini && (book.author || book.isbn) && <span>{book.author ? "by "+book.author : ""}{book.author && book.isbn ? " · " : ""}{book.isbn ? "ISBN/ASIN: "+book.isbn : ""}</span>}
            </span>
          </button>
          {book.memberOnly && <span className="bk-book-member-icon"
            title="Alveary member resource — links are not public">
            <LockKeyhole size={14} aria-hidden="true"/>
            <span className="sr-only">Member-only resource links</span>
          </span>}
        </div>
        {showSummary && !showDetails && book.rationale &&
          <p className="bk-book-rationale-preview">{book.rationale}</p>}
        {showSummary && <div className="bk-book-meta">
          <span>Scope: {bookTermSummary(book)}</span>
          {role && !mini && <span>{role}</span>}
          {optional && <span>Optional</span>}
          {chooseOne && <span>Choose one</span>}
          {!mini && showLocation && locations.length > 0 && <span className="bk-book-course-tag">{locations[0]}
            {locations.length>1 ? " · shared in "+locations.length+" uses" : ""}</span>}
        </div>}
        {showSummary && !mini && visibleLinks.length>0 && <div className="bk-book-links">
          {visibleLinks.map((link,i) => <a key={i} href={link.url}
            target="_blank" rel="noopener noreferrer">
            <ExternalLink size={12} aria-hidden="true"/>{link.label}
          </a>)}
        </div>}
      </div>
    </div>
    {showDetails && <div className="bk-book-description">
      {book.rationale && <div className="bk-book-rationale">
        <strong>Why we recommend it</strong>
        <p>{book.rationale}</p>
      </div>}
      {book.isbn && <p className="bk-book-isbn">ISBN/ASIN: {book.isbn}</p>}
      {!mini && showLocation && book.uses.length>0 && <div className="bk-book-usages">
        <strong>Used with</strong>
        <span>{locations.join(" · ")}</span>
      </div>}
      {mini && visibleLinks.length>0 && <div className="bk-book-links">
        {visibleLinks.map((link,i)=><a key={i} href={link.url}
          target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} aria-hidden="true"/>{link.label}</a>)}
      </div>}
      {book.memberOnly && <p className="bk-book-member-note">
        Resource links are not available in public browsing.
      </p>}
      {!book.memberOnly && !visibleLinks.length && <p className="bk-book-member-note">
        No public resource link listed.
      </p>}
    </div>}
  </article>;
}
