import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const catalog=JSON.parse(read("app/books/catalog-resources-preview.json"));
const notes=JSON.parse(read("app/books/public-resource-notes-preview.json"));
const row=read("app/books/BookResourceRow.tsx");
const css=read("app/books/book-planning.css");
const state=read("app/components/PlanningDeskContext.tsx");
const resources=new Set(catalog.resources.map(r=>r.id));

assert.equal(catalog.resources.length,345);
assert.equal(catalog.resources.filter(r=>r.memberOnly).length,43);
assert.equal(Object.keys(notes.notesByResourceId).length,177,
 "Only unchanged, previously publicly published source notes are allowed");
assert.ok(Object.entries(notes.notesByResourceId).every(([id,text])=>
 resources.has(id) && typeof text==="string" && text.trim().length>0),
 "Every published note must resolve to a current preview resource");
assert.ok(Object.values(notes.notesByResourceId).every(text=>
 !/(?:https?:\/\/|www\.)/i.test(text)),
 "No external URLs are allowed inside these public note fields");
assert.ok(catalog.resources.filter(r=>r.memberOnly).every(r=>r.links.length===0),
 "A member-only resource must never expose external public links");
assert.ok(catalog.resources.every(r=>!Object.hasOwn(r,"notes")),
 "Do not leak the unreviewed staging notes field into the public preview");

assert.match(state,/bookDetails: "detailed", bookScope: "school"/,
 "Fresh Book List views should show complete rationales from the outset");
assert.match(state,/saved\.bookDetails === "compact" \? "compact"/,
 "Existing intentional compact preferences must survive");
assert.match(state,/saved\.bookDetails === "detailed" \? "detailed"/,
 "Existing intentional detailed preferences must survive");
assert.match(row,/const defaultDetails = density === "detailed"/);
const page=read("app/books/page.tsx");
assert.match(page,/const \[publicDensity,setPublicDensity\] = useState<"compact"\|"topics"\|"detailed">\("detailed"\)/,
 "Public Explore must start in Detailed without inheriting stored member preferences");
assert.match(page,/signedIn \? desk\.bookDetails : publicDensity/,
 "Signed-in members keep their own saved detail preference");
assert.match(row,/<p>\{book\.rationale\}<\/p>/,
 "Full rationale text must render without a truncation transform");
assert.match(row,/publishedNotes\.notesByResourceId/);
assert.match(row,/<p>\{publicNote\}<\/p>/);
assert.match(row,/showSummary && !showDetails && \(hasSummaryPrimary\|\|sharedDetails\)/,
 "Expanded must still show approved notes and shared-resource context");

assert.match(row,/book\.memberOnly \? \[\] : book\.links/);
assert.match(css,/\.bk-book-planning-note/);
assert.match(css,/\.bk-book-rationale p \{ line-height:1\.7; \}/);
assert.doesNotMatch(css,/-webkit-line-clamp/,
 "Even Expanded must show the complete rationale, not a two-line clip");
assert.match(css,/\.bk-book-rationale-preview[^}]*white-space:pre-line/s);

assert.doesNotMatch(css,/\.bk-book-rationale p[^}]*-webkit-line-clamp/s,
 "Full rationales must never use the two-line preview's truncation");

const approved=new Set([
 "#596e5e","#7b8b7f","#9da89f","#bdc5bf",
 "#adb58f","#bec5a6","#ced3bc","#dee1d2",
 "#babbac","#cecfbd","#e0e1d2","#e8e9e2",
 "#f4eed9","#f6f2e1","#faf7ed","#fbfbf9",
 "#262b26","#3b413b","#505650","#666d66","#d2d6d2","#e5e8e5",
]);
const solidColors=(css.match(/#[0-9a-fA-F]{6,8}\b/g)??[]).map(c=>c.toLowerCase());
assert.ok(solidColors.every(c=>approved.has(c)||c==="#262b2614"),
 "Book CSS must use only approved Alveary colors or a derived-alpha swatch");
for(const semantic of ["bk-ink","bk-muted","bk-sage","bk-line","bk-surface","bk-white","bk-olive"])
 assert.ok(css.includes("--"+semantic+":"));
assert.ok(css.includes(".bk-page, .pd-wrapper.is-books, .bp-full"),
 "Book palette overrides must not recolor Course List's established hierarchy");
console.log("Book content-first default, 177 vetted notes, approved Book-only palette and restricted URLs verified.");
