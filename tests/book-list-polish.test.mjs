import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const bookCatalog=JSON.parse(read("app/books/catalog-resources-preview.json"));
const covers=JSON.parse(read("app/books/book-cover-map.json"));
const resourceIds=new Set(bookCatalog.resources.map(book=>book.id));
const mapped=Object.entries(covers.legacyResourceIds);
assert.equal(bookCatalog.resources.length,345);
assert.equal(mapped.length,317,"Exact title+edition cover matches should stay reviewed");
assert.ok(covers.imageBase==="https://planning.alveary.org/img/resources/",
  "Existing images must point to the stable GitHub Pages thumbnail host");
assert.ok(mapped.every(([current,legacy])=>resourceIds.has(current)&&
  /^rec[A-Za-z0-9]+$/.test(legacy)));
assert.ok(Array.isArray(covers.newCoverIds));
assert.ok(covers.newCoverIds.every(id=>resourceIds.has(id)));
assert.ok(!JSON.stringify(covers).includes("airtableusercontent.com"),
  "Never persist signed Airtable attachment URLs into public image maps");

const row=read("app/books/BookResourceRow.tsx");
const css=read("app/books/book-planning.css");
const page=read("app/books/page.tsx");
const desk=read("app/components/PlanningDesk.tsx");
const pipeline=read("tools/sync-book-covers-from-airtable.mjs");

assert.match(row,/book-cover-map\.json/);
assert.match(row,/book\\.memberOnly \\? \\[\\] : book\\.links/);
assert.match(row,/Rationale:/);
assert.match(row,/book\\.rationale/);
assert.match(row,/ResourceCover book=\\{book\\}/);
assert.match(row,/local \\? "\\/book-covers\\//);
assert.match(row,/loading="lazy"/);
assert.match(css,/\\.bk-mode-switch button\\.is-current/);
assert.match(page,/className="bk-mode-switch"/);
assert.doesNotMatch(page,/className="cx-mode-switch"/,
  "Book List must not borrow route-injected Course List mode styles");
assert.match(page,/bk-catalog-primary/);
assert.match(page,/bk-catalog-secondary/);
assert.match(css,/\\.pd-wrapper\\.is-books \\.pd-desk \\.pd-body/);
assert.match(desk,/onBooks \\? " is-books" : ""/);
assert.doesNotMatch(desk,/<ArrowLeft size=\\{14\\}\\/?> Back to Course List/,
  "Mini book desk should not grow a duplicate navigation row");
assert.match(pipeline,/AIRTABLE_PAT/);
assert.match(pipeline,/Image/);
assert.match(pipeline,/attachment\\.id/);
assert.doesNotMatch(pipeline,/process\\.env\\.AIRTABLE_PAT\\s*\\|\\|\\s*"/,
  "Never ship fallback Airtable API credentials");
console.log("Book List familiar styling, GitHub cover mapping, mini spacing and public-link invariants verified.");
