import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const bookCatalog=JSON.parse(read("app/books/catalog-resources-preview.json"));
const covers=JSON.parse(read("app/books/book-cover-map.json"));
const resourceIds=new Set(bookCatalog.resources.map(book=>book.id));
const mapped=Object.entries(covers.legacyResourceIds);
assert.equal(bookCatalog.resources.length,345);
assert.equal(mapped.length,317,"Exact title+edition cover matches should stay reviewed");
assert.equal(covers.imageBase,"https://planning.alveary.org/img/resources/");
assert.ok(mapped.every(([current,legacy])=>resourceIds.has(current)&&
  /^rec[A-Za-z0-9]+$/.test(legacy)));
assert.ok(Array.isArray(covers.newCoverIds));
assert.ok(covers.newCoverIds.every(id=>resourceIds.has(id)));
assert.ok(!JSON.stringify(covers).includes("airtableusercontent.com"),
  "Never persist expiring Airtable URLs into public image maps");

const row=read("app/books/BookResourceRow.tsx");
const css=read("app/books/book-planning.css");
const page=read("app/books/page.tsx");
const desk=read("app/components/PlanningDesk.tsx");
const publisher=read("tools/sync-book-covers-from-airtable.mjs");

assert.ok(row.includes("book-cover-map.json"));
assert.ok(row.includes("book.memberOnly ? [] : book.links"));
assert.ok(row.includes("Why we recommend it"));
assert.ok(css.includes('content:"Rationale: "'));
assert.ok(row.includes("book.rationale"));
assert.ok(row.includes("ResourceCover book={book}"));
assert.ok(row.includes('local ? "/book-covers/"'));
assert.ok(row.includes('loading="lazy"'));
assert.ok(css.includes(".bk-mode-switch button.is-current"));
assert.ok(page.includes('className="bk-mode-switch"'));
assert.ok(!page.includes('className="cx-mode-switch"'),
  "Book List cannot rely on visiting Courses to load its toggle styles");
assert.ok(page.includes("bk-catalog-primary"));
assert.ok(page.includes("bk-catalog-secondary"));
assert.ok(css.includes(".pd-wrapper.is-books .pd-desk .pd-body"));
assert.ok(desk.includes('onBooks ? " is-books" : ""'));
assert.ok(!desk.includes('> Back to Course List'),
  "Do not render a duplicate course link inside the Book mini desk");
assert.ok(publisher.includes("AIRTABLE_PAT"));
assert.ok(publisher.includes("attachment.id"));
assert.ok(!publisher.includes('AIRTABLE_PAT || "'),
  "Never ship fallback Airtable API credentials");
console.log("Book List visual foundation, GitHub covers, mini margins and protected links verified.");
