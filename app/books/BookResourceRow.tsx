"use client";

import { useEffect, useState } from "react";
import { BookOpen, ExternalLink, LockKeyhole } from "lucide-react";
import type { ResourceBook } from "./book-relationships.mjs";
import { bookTermSummary, noteExplainsMemberAccess } from "./book-relationships.mjs";
import covers from "./book-cover-map.json";
import publishedNotes from "./public-resource-notes-preview.json";

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
  groupedChoice = false, memberView = false,
}: {
  book: ResourceBook;
  density: Density;
  courseByEdition: Map<string,CourseLabel>;
  mini?: boolean;
  showLocation?: boolean;
  groupedChoice?: boolean;
  memberView?: boolean;
}) {
  const [opened,setOpened] = useState<boolean | null>(null);
  useEffect(() => setOpened(null),[density]);
  // Only source notes whose wording matches the previously published Alveary
  // catalog are included here; draft/internal writer notes stay private.
  const publicNote = (publishedNotes.notesByResourceId as Record<string,string>)[book.id];
  // When the approved published note already explains member access,
  // don't repeat the generic public-link notice beneath it.
  const hasMemberAccessNote = noteExplainsMemberAccess(publicNote);
  const defaultDetails = density === "detailed";
  const showDetails = opened ?? defaultDetails;
  const showSummary = density !== "compact" && !mini || showDetails;
  // The alphabetical By Book view carries full parent › topic breadcrumbs.
  // Mini My Books and older views can still fall back to edition titles.
  const locations = book.coursePaths?.length ? book.coursePaths :
    [...new Map(book.uses.map(use => {
      const course = courseByEdition.get(use.editionId);
      return [use.editionId, course ? course.title : "Course resource"];
    })).values()];
  const chooseOne = book.uses.some(use => use.chooseOne);
  const optional = book.uses.some(use => use.optional);
  // Defense in depth: restricted resources must not expose external URLs,
  // even if a link-level flag was accidentally overlooked.
  const visibleLinks = book.memberOnly ? [] : book.links.filter(link =>
    /^https:\/\//.test(link.url));
  const roleNames:Record<string,string> = {
    Main:"Main Text",Supporting:"Supporting Text",Reference:"Reference Text",
  };
  const roles = [...new Set(book.uses.map(use => use.role)
    .filter((value):value is string=>typeof value==="string" && value.length>0))];
  const role = roles.map(value=>roleNames[value]??value).join(" · ");
  const coverRole = roles.length === 1 ? role : roles.length > 1 ? "Multiple roles" : "";
  const gradeTags = [...new Set(book.uses.map(use=>use.gradeLevelTag)
    .filter((value):value is string=>typeof value==="string" && value.length>0))];
  // Assignment rationale is authored for this edition but belongs in the
  // same "Why we recommend it" narrative, without a repeated course heading.
  const additionalRationales = [...new Set(book.uses
    .map(use=>use.additionalRationale?.trim()).filter(
      (text):text is string=>typeof text==="string" && text.length>0))];
  const sharedPaths=book.sharedIn??[];
  const showShared=sharedPaths.length>1;
  const alternateTitles = [...new Set(book.uses.flatMap(use=>use.alternativeTitles??[]))]
    .filter(title=>title!==book.title);
  const optionalUses = book.uses.filter(use => use.optional);
  const choiceUses = book.uses.filter(use => use.chooseOne);
  const mixedOptional = optionalUses.length > 0 && optionalUses.length < book.uses.length;
  const mixedChoice = choiceUses.length > 0 && choiceUses.length < book.uses.length;

  return <article className={"bk-book-row" + (mini ? " is-mini" : "")}>

    <div className="bk-book-line">
      <div className="bk-book-cover-column">
        <ResourceCover book={book} mini={mini}/>
        {!mini && coverRole && <span className="bk-book-role" title={role}>{coverRole}</span>}
      </div>
      <div className="bk-book-main">
        <div className="bk-book-heading">
          <button type="button" className="bk-book-expand" aria-expanded={showDetails}
            aria-label={(showDetails ? "Hide" : "Show") + " full details for " + book.title}
            onClick={() => setOpened(value => !(value ?? defaultDetails))}>
            <span className="bk-book-heading-text">
              <span className="bk-book-title-line">
                <strong>{book.title}</strong>
                {(gradeTags.length>0 || optional || chooseOne&&!groupedChoice) &&
                  <span className="bk-book-flags" aria-label="Resource guidance">
                    {gradeTags.map(tag=><span key={tag} className="bk-book-flag is-grade">{tag}</span>)}
                    {optional && <span className="bk-book-flag is-optional"
                      title={mixedOptional ? "Optional in some uses" : "Optional resource"}>
                      {mixedOptional ? "OPTIONAL IN SOME USES" : "OPTIONAL"}
                    </span>}
                    {chooseOne && !groupedChoice && <span className="bk-book-flag is-choice">
                      {mixedChoice ? "CHOOSE ONE IN SOME USES" : "CHOOSE ONE"}
                    </span>}
                  </span>}
              </span>
              {!mini && (book.author || book.isbn) && <span className="bk-book-byline">
                {book.author ? "by "+book.author : ""}{book.author && book.isbn ? " · " : ""}
                {book.isbn ? "ISBN/ASIN: "+book.isbn : ""}
              </span>}
            </span>
          </button>
          {book.memberOnly && !memberView && <span className="bk-book-member-icon"
            title="Alveary member resource — links are not public">
            <LockKeyhole size={14} aria-hidden="true"/>
            <span className="sr-only">Member-only resource links</span>
          </span>}
        </div>
        {showSummary && !showDetails &&
          <div className="bk-book-rationale bk-book-rationale-brief">
            <div className="bk-book-rationale-head">
              <strong>Why we recommend it</strong>
              <span className="bk-book-scope">Scope: {bookTermSummary(book)}</span>
            </div>
            {book.rationale && <p className="bk-book-rationale-preview">{book.rationale}</p>}
            {additionalRationales.map((text,i)=><p key={i} className="bk-book-extra-rationale">{text}</p>)}
          </div>}
        {showSummary && !showDetails && publicNote &&
          <div className="bk-book-planning-note is-summary">
            <strong>Note</strong>
            <p>{publicNote}</p>
          </div>}
        {showSummary && !showDetails && showShared && !mini &&
          <div className="bk-book-shared"><strong>↔ Shared</strong>
            <span>{sharedPaths.join(" · ")}</span>
          </div>}
        {showSummary && (mini && role || !mini && showLocation && locations.length>0) &&
          <div className="bk-book-meta">
            {mini && role && <span>{role}</span>}
            {!mini && showLocation && locations.length>0 &&
              <span className="bk-book-course-tag">{locations[0]}
                {locations.length>1 ? " · shared in "+locations.length+" uses" : ""}</span>}
          </div>}
        {chooseOne && !groupedChoice && alternateTitles.length>0 &&
          <p className="bk-book-choices-inline">Choose this or {alternateTitles.join(" / ")}</p>}
        {showSummary && !mini && visibleLinks.length>0 && <div className="bk-book-links-scope">
          {!mini && visibleLinks.length>0 && <div className="bk-book-links">
            {visibleLinks.map((link,i) => <a key={i} href={link.url}
              target="_blank" rel="noopener noreferrer">
              <ExternalLink size={12} aria-hidden="true"/>{link.label}
            </a>)}
          </div>}
        </div>}
        {!showSummary && !mini && <p className="bk-book-compact-scope">
          Scope: {bookTermSummary(book)}
        </p>}
      </div>
      {showDetails && <div className="bk-book-description">
      {(book.rationale || additionalRationales.length>0 || !mini) &&
        <div className="bk-book-rationale">
          <div className="bk-book-rationale-head">
            {book.rationale || additionalRationales.length>0
              ? <strong>Why we recommend it</strong> : <span />}
            <span className="bk-book-scope">Scope: {bookTermSummary(book)}</span>
          </div>
          {book.rationale && <p>{book.rationale}</p>}
          {additionalRationales.map((text,i)=><p key={i} className="bk-book-extra-rationale">{text}</p>)}
        </div>}
      {publicNote && <div className="bk-book-planning-note">
        <strong>Note</strong>
        <p>{publicNote}</p>
      </div>}
      {(book.formats || book.save || book.print || book.maySub || book.discount ||
        book.discountCode) && <div className="bk-book-guidance">
        {book.formats && <div className="bk-book-guidance-line">
          <strong>Alt. Formats:</strong>
          <span className="bk-book-format-chips">{book.formats.split(",").map(format=>
            <span key={format} className="bk-book-format">{format.trim()}</span>)}</span>
        </div>}
        {(book.save || book.print) && <div className="bk-book-guidance-line">
          <strong>Preparation</strong>
          <span>{[book.save?"Save":"",book.print?"Print":""].filter(Boolean).join(" · ")}</span>
        </div>}
        {book.maySub && <div className="bk-book-guidance-line">
          <strong>May substitute</strong><span>{book.maySub}</span>
        </div>}
        {(book.discount || book.discountCode) && <div className="bk-book-guidance-line">
          <strong>Discount</strong>
          <span>{book.discount}{book.discountCode
            ? " · Code: "+book.discountCode : ""}</span>
        </div>}
      </div>}
      {mini && book.isbn && <p className="bk-book-isbn">ISBN/ASIN: {book.isbn}</p>}
      {showShared && !mini && <div className="bk-book-shared">
        <strong>↔ Shared</strong><span>{sharedPaths.join(" · ")}</span>
      </div>}
      {!showShared && !mini && showLocation && book.uses.length>0 && <div className="bk-book-usages">
        <strong>Used with</strong>
        <span>{locations.join(" · ")}</span>
      </div>
      {mini && visibleLinks.length>0 && <div className="bk-book-links">
        {visibleLinks.map((link,i)=><a key={i} href={link.url}
          target="_blank" rel="noopener noreferrer">
          <ExternalLink size={12} aria-hidden="true"/>{link.label}</a>)}
      </div>}
      {book.memberOnly && !memberView && !hasMemberAccessNote && <p className="bk-book-member-note">
        Resource available to Alveary members only.
      </p>}
      {/* When a field or link is absent, it takes up no space at all. */}
      </div>}
      </div>
    </div>
  </article>;
}
