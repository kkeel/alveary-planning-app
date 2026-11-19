import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shell = read("app/components/AppShell.tsx");
const auth = read("app/components/PlannerAuthProvider.tsx");
const runtime = read("app/components/MemberstackRuntime.tsx");
const layout = read("app/layout.tsx");
const courseExplorer = read("app/courses/CourseExplorer.tsx");
const books = read("app/books/page.tsx");
const docs = read("docs/auth-and-public-views.md");

test("Courses and Books are canonical same-URL public/member pages", () => {
  assert.match(shell, /\{ href: "\/courses", label: "Courses"/);
  assert.match(shell, /\{ href: "\/books", label: "Books"/);
  assert.match(shell, /const publicCatalog = activePath === "\/courses" \|\| activePath === "\/books";/);
  assert.match(shell, /const checking = !publicCatalog &&/,
    "No Connecting to Alveary gate may block ordinary course or book browsing");
  assert.match(shell, /\{!publicCatalog && <AuthStatusBar \/>\}/,
    "Catalogs should not require or advertise a sign-in before reading");
  assert.match(courseExplorer, /const mode: Mode = signedIn \? desk\.courseMode : "browse"/,
    "Unsigned visitors must stay browse-only; signed members can use their saved mode");
  assert.match(books, /const signedIn = status === "signed-in"/);
  assert.ok(docs.includes("https://plan.alveary.org/courses/"));
  assert.ok(docs.includes("https://plan.alveary.org/books/"));
  assert.ok(!docs.includes("https://plan.alveary.org/public/courses/"));
});

test("A Webflow referral never starts SSO; member handoff still requires explicit intent", () => {
  assert.doesNotMatch(auth,/fromAlvearyTestDashboard/);
  assert.match(auth, /!isHandoffProofRoute\(\) && memberEntryIntent\(\)/);
  assert.match(auth, /destination\.searchParams\.set\("auto", "1"\)/);
  assert.match(auth, /window\.location\.replace\(destination\.toString\(\)\)/);
  assert.match(auth, /memberstack-plan-access/,
    "Private planning access must keep server-side entitlement verification");
  assert.match(shell, /const signedIn = status === "signed-in"/);
  assert.match(shell, /const showDesk = signedIn &&/,
    "Private Planning Desk must not appear for anonymous visitors");
});

test("The Memberstack SDK loads for handoff only, not for affiliate-link review", () => {
  assert.match(layout, /<MemberstackRuntime \/>/);
  assert.doesNotMatch(layout,/static\.memberstack\.com/);
  assert.match(runtime, /const isHandoff = pathname\.replace\(/);
  assert.match(runtime, /if \(!isHandoff\) return;/);
  assert.match(runtime, /script\.src = "https:\/\/static\.memberstack\.com\/scripts\/v2\/memberstack\.js";/);
  assert.match(runtime, /setCookieOnRootDomain: true/);
});

console.log("Canonical public Course/Book List opens without membership gate, with member enhancements after verification.");
