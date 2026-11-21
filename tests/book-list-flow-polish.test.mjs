import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { bookTermSummary, noteExplainsMemberAccess } from "../app/books/book-relationships.mjs";

const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");
const row = read("app/books/BookResourceRow.tsx");
const hierarchy = read("app/books/BookCourseHierarchy.tsx");
const css = read("app/books/book-planning.css");
const notes = JSON.parse(read("app/books/public-resource-notes-preview.json")).notesByResourceId;
const books = JSON.parse(read("app/books/catalog-resources-preview.json")).resources;

// The five public Our Work notes explicitly describe member-only access;
// the generic warning must not be repeated underneath those notes.
const memberWithAccessNote = books.filter(book =>
  book.memberOnly && noteExplainsMemberAccess(notes[book.id]));
assert.equal(memberWithAccessNote.length, 5);
assert.ok(memberWithAccessNote.every(book =>
  book.title.startsWith("Our Work:")));
assert.equal(noteExplainsMemberAccess("Our Work is available to Alveary members only."), true);
assert.equal(noteExplainsMemberAccess("Only available to Alveary members"), true);
assert.equal(noteExplainsMemberAccess("Members-only resource"), true);
assert.equal(noteExplainsMemberAccess("A different page number is needed."), false);
assert.equal(noteExplainsMemberAccess(undefined), false);
assert.equal(noteExplainsMemberAccess(""), false);
assert.match(row, /book\.memberOnly && !memberView && !hasMemberAccessNote/);
assert.match(row, /Resource available to Alveary members only/);
assert.match(row, /visibleLinks = book\.memberOnly \? \[\] : book\.links/,
  "Protected resource links must remain absent");

// Title/summary still open and close using buttons or native details, but
// neither level displays distracting chevron artwork.
assert.doesNotMatch(row, /ChevronDown|ChevronRight/);
assert.doesNotMatch(hierarchy, /ChevronRight|ChevronDown|bk-tree-chevron/);
assert.match(row, /aria-expanded=\{showDetails\}/);
assert.match(hierarchy, /<summary>/);
assert.match(hierarchy, /<Disclosure/);
assert.match(row, /<strong>Note<\/strong>/);
assert.doesNotMatch(row, /Planning note/);
assert.match(hierarchy, /className="bk-course-meta-divider"/);
assert.match(hierarchy, /aria-hidden="true">\|<\/span>/);
assert.match(hierarchy, /group\.course\.gradeDisplay &&/);
assert.doesNotMatch(hierarchy, /section\.courses\.length/,
  "Subject headings should contain only the subject title");
assert.match(hierarchy, /group\.count===1\?"resource":"resources"/,
  "Course resource counts remain shown");

// No conspicuous hover fill; a quiet text underline still indicates that
// course/topic headings and book titles are interactive.
assert.match(css, /\.bk-book-row:hover \.bk-book-line \{ background:transparent; \}/);
assert.match(css, /\.bk-course-group>summary:hover,[\s\S]*?\{ background:transparent; \}/);
assert.match(css, /\.bk-course-group>summary:hover \.bk-course-title/);
assert.match(css, /\.bk-book-expand:hover strong/);
assert.match(css, /\.bk-course-meta-divider \{ color:#bdc5bf/);
assert.match(css, /\.bk-book-planning-note \{[^}]*background:transparent; \}/);
assert.match(css, /\.bk-book-planning-note \{[^}]*border-top:1px solid var\(--bk-line\)/);
assert.doesNotMatch(css, /\.bk-tree-chevron/);

// Guidance flags are explicit, including multi-option recommendations, and
// roles sit beneath the image rather than competing with scope metadata.
assert.match(row, /className="bk-book-cover-column"/);
assert.match(row, /className="bk-book-role"/);
assert.match(row, /CHOOSE ONE/);
assert.match(row, /OPTIONAL IN SOME USES/);
assert.match(row, /className="bk-book-links-scope"/);
assert.match(row, /gradeTags\.map\(tag=>/);
assert.match(row, /gradeLevelTag/);
assert.match(row, /additionalRationales/);
assert.match(row, /bk-book-rationale-head/);
assert.match(row, /May substitute/);
assert.match(row, /Discount/);
assert.match(row, /Alt. Formats:/);
assert.match(row, /Preparation/);
assert.match(hierarchy, /bk-choice-group/);
assert.match(hierarchy, /Choose one book from these alternatives/);
assert.match(hierarchy, /group\.course\.type!=="Combined Course"/);
assert.match(css, /\.bk-cover \{[^}]*background:#e8e9e2/);
assert.match(css, /\.bk-cover img \{[^}]*object-fit:cover/);
assert.match(css, /\.bk-topic-group:last-child \.bk-topic-books > \.bk-book-row:last-child/);
assert.equal(bookTermSummary({uses:[{term1:"Full Term",term2:"Partial Term",term3:"Selections"}]}),
  "Term 1 (Full Term) · Term 2 (Partial Term) · Term 3 (Selections)");

// Empty fields do not leave visible placeholders or reserve link space.
assert.doesNotMatch(row,/No public resource link listed/);
assert.match(row,/visibleLinks\.length>0/);
assert.match(row,/bk-book-title-line/);
assert.match(css,/\.bk-book-flag\.is-optional \{ color:#fbfbf9; \}/);
assert.match(css,/\.bk-book-main>\.bk-book-description \{ margin:8px 0 10px/);
assert.match(row,/additionalRationales\.map\(\(text,i\)/);
assert.doesNotMatch(row,/item\.label/);
assert.match(row, /Alt. Formats:/);
assert.match(row,/↔ Shared/);
assert.match(hierarchy,/Any one of the books below/);
assert.doesNotMatch(hierarchy,/alternatives\.map\(item=>item\.title\)\.join\(" or "\)/);
assert.match(hierarchy,/memberView=\{memberView\}/);

// Keep full rationale and previously approved note visibility intact.
assert.match(row, /<p>\{book\.rationale\}<\/p>/);
assert.match(row, /<p>\{publicNote\}<\/p>/);
assert.match(row, /const defaultDetails = density === "detailed"/);
console.log("Book flow polish: quiet hover, clickable titles, note access handling, and clean heading metadata passed.");
