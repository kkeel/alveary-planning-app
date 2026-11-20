import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const file = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const catalog = JSON.parse(file("app/courses/catalog-preview.json"));
const books = file("app/books/page.tsx");
const bookContent = file("app/books/BookPlanningContent.tsx");
const desk = file("app/components/PlanningDesk.tsx");
const context = file("app/components/PlanningDeskContext.tsx");
const shell = file("app/components/AppShell.tsx");
const topics = file("app/components/CourseTopicReview.tsx");

assert.match(books, /useSearchParams/);
assert.match(books, /requestedId = params.get\("course"\)/);
assert.match(books, /requestedTopicId = params.get\("topic"\)/);
assert.match(books, /childTopics\.some\(t=>t\.id===requestedTopicId\)/);
assert.match(books, /Clear focus/);
assert.match(books, /Suspense/);
assert.match(books, /buildBookCourseGroups\(resources,courses/);
assert.match(books, /focusCourseId:focusError/);
assert.match(books, /BookCourseHierarchy/);
assert.match(context, /bookMode: "browse" \| "plan"/);
assert.match(context, /bookTab: "books" \| "budget"/);
assert.match(context, /bookMode: saved\.bookMode === "plan"/);
assert.match(context, /bookTab: saved\.bookTab === "budget"/);
assert.match(shell, /activePath === "\/books" && bookMode === "browse"/);
assert.match(desk, /onBooks \? <BookPlanningContent\/>/);
assert.match(desk, /onBooks \? "Book Planning Desk sections"/);
assert.match(desk, /<BookPlanningContent variant="full"/);
assert.match(desk, /if \(onBooks\) desk\.setBookMode\("plan"\)/);
assert.match(topics, /encodeURIComponent\(parent\.id\).*encodeURIComponent\(topic\.id\)/s);
assert.match(bookContent, /plan\.courses\.filter\(saved=>saved\.stage==="planned"\)/);
assert.match(bookContent, /booksForMyPlan\(resources,courses/);
assert.match(bookContent, /won't show \$0/i);
assert.doesNotMatch(bookContent, /Math\.random|mockPurchase|fakePrice/);

// Verify deep-link identities against actual 2027–28 data, including
// a topic shared by more than one combined course.
const byEdition = new Map(catalog.courses.map(c => [c.editionId, c]));
const byId = new Map(catalog.courses.map(c => [c.id, c]));
const connections = new Map();
for (const link of catalog.topicLinks) {
  const parent = byEdition.get(link.parentEditionId);
  const child = byEdition.get(link.childEditionId);
  assert.ok(parent && child, "Every link resolves in this draft snapshot");
  assert.ok(child.type === "Topic" || child.type === "Single-Topic Course",
    "A combined course may explicitly link a single-topic edition");
  assert.ok(byId.has(parent.id) && byId.has(child.id));
  const parents = connections.get(child.id) ?? new Set();
  parents.add(parent.id);
  connections.set(child.id, parents);
}
assert.ok([...connections.values()].some(parents => parents.size >= 2),
  "Shared-topic parent context must be preserved");
console.log("Book List planning shell and shared-topic deep-link contract checks passed.");
