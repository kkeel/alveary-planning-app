import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { noteExplainsMemberAccess } from "../app/books/book-relationships.mjs";

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
assert.match(row, /book\.memberOnly && !hasMemberAccessNote/);
assert.match(row, /Resource links are not available in public browsing/);
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

// Keep full rationale and previously approved note visibility intact.
assert.match(row, /<p>\{book\.rationale\}<\/p>/);
assert.match(row, /<p>\{publicNote\}<\/p>/);
assert.match(row, /const defaultDetails = density === "detailed"/);
console.log("Book flow polish: quiet hover, clickable titles, note access handling, and clean heading metadata passed.");
