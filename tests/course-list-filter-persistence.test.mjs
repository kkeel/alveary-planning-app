import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../"+path,import.meta.url),"utf8");
const context = read("app/components/PlanningDeskContext.tsx");
const explorer = read("app/courses/CourseExplorer.tsx");
const shell = read("app/components/AppShell.tsx");

// Grade + country already survived member navigation. Include subject and
// course search in the same saved, account-scoped planning preferences.
for (const field of ["grades","country","subjectFilter","courseSearch"]) {
  assert.ok(context.includes(field+": "), "Missing saved filter: "+field);
  assert.ok(context.includes("saved."+field), "Missing hydration for "+field);
}
assert.ok(context.includes('subjectFilter: "", courseSearch: "",'),
  "Fresh members start with no subject and no query restriction");
assert.ok(context.includes("setSubjectFilter: subject => setValue("));
assert.ok(context.includes("setCourseSearch: query => setValue("));
assert.ok(context.includes("subjectFilter: normalizeFilterText(saved.subjectFilter, 100)"));
assert.ok(context.includes("courseSearch: normalizeFilterText(saved.courseSearch, 500)"));
assert.ok(context.includes("window.localStorage.setItem(storageKey, JSON.stringify(value))"),
  "All filter fields must be serialized with the same persisted preferences");
assert.ok(context.includes('storageScope === "public"'),
  "Do not store public browsing filters under another member account");
assert.ok(shell.includes('storageScope={userId ?? "public"}'),
  "Filter preferences must stay tied to each authenticated member");

assert.ok(explorer.includes("const subject = desk.subjectFilter;"));
assert.ok(explorer.includes("const setSubject = desk.setSubjectFilter;"));
assert.ok(explorer.includes("const query = desk.courseSearch;"));
assert.ok(explorer.includes("const setQuery = desk.setCourseSearch;"));
assert.ok(!explorer.includes('const [subject, setSubject] = useState("")'));
assert.ok(!explorer.includes('const [query, setQuery] = useState("")'));
assert.ok(explorer.includes('id="cx-subject-filter"'),"Subject selector still rendered");
assert.ok(explorer.includes("value={subject} onChange={event => setSubject(event.target.value)}"));
assert.ok(explorer.includes('value={query} onChange={event => setQuery(event.target.value)}'));
assert.ok(explorer.includes('setGrades([]); setCountry("all"); setSubject(""); setQuery("");'),
  "Show all courses clears both old and new filters");
assert.ok(explorer.includes('{subject && <span>{subject}</span>}'),
  "Mobile filter summary restores selected subject");
console.log("Account-scoped Course List subject/search filter persistence: OK");
