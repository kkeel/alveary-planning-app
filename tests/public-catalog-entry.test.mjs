import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const auth = read("app/components/PlannerAuthProvider.tsx");
const shell = read("app/components/AppShell.tsx");
const layout = read("app/layout.tsx");
const sdk = read("app/components/MemberstackRuntime.tsx");
const paths = read("app/components/public-catalog-routes.ts");
const courses = read("app/public/courses/page.tsx");
const books = read("app/public/books/page.tsx");
const explorer = read("app/courses/CourseExplorer.tsx");

test("website-facing catalog routes exist independently of authenticated planning", () => {
  assert.match(paths, /"\/public\/courses", "\/public\/books"/);
  assert.match(courses, /import CourseExplorer from "\.\.\/\.\.\/courses\/CourseExplorer"/);
  assert.match(courses, /<CourseExplorer \/>/);
  assert.match(books, /<h1>Book List<\/h1>/);
  assert.match(books, /Public book browsing is coming soon/);
  assert.match(explorer, /const mode: Mode = signedIn \? desk\.courseMode : "browse"/,
    "read-only CourseExplorer mode must not expose planning actions");
  assert.match(explorer, /\{signedIn && <button type="button"/);
});

test("explicit public routes skip planner auth session and entitlement checks", () => {
  assert.match(shell, /<PlannerAuthProvider publicOnly=\{publicOnly\}>/);
  assert.match(auth, /export function PlannerAuthProvider\(\{ children, publicOnly = false \}/);
  assert.match(auth, /if \(publicOnly \|\| !client\) return;/,
    "never subscribe to auth or initialize Supabase session on public paths");
  assert.match(auth, /if \(publicOnly\) return;\s*if \(!session\)/,
    "never invoke the current-year membership verifier on public pages");
  assert.match(auth, /const status: AuthStatus = publicOnly \? "public"/);
  assert.match(auth, /userId: publicOnly \? null/);
  assert.match(auth, /if \(publicOnly \|\| !client\) return null;/,
    "getAccessToken must not reveal private credentials from the public route");
  assert.match(shell, /const checking = !publicOnly &&/,
    "public visitors never see an authentication checking screen");
  assert.match(shell, /\{!publicOnly && <AuthStatusBar \/>\}/,
    "website visitors are not required or prompted to authenticate");
  assert.doesNotMatch(auth, /fromAlvearyTestDashboard/,
    "the Webflow referrer alone must never launch a membership handoff");
  assert.match(auth, /!isHandoffProofRoute\(\) && memberEntryIntent\(\)/,
    "explicit connect=1 remains the only automatic sign-in intent");
});

test("public route does not load Memberstack SDK or switch to private navigation", () => {
  assert.match(layout, /<MemberstackRuntime \/>/);
  assert.doesNotMatch(layout, /src="https:\/\/static\.memberstack\.com\/scripts\/v2\/memberstack\.js"/,
    "the Memberstack SDK must not load unconditionally at layout time");
  assert.match(sdk, /if \(isPublicCatalogPath\(pathname\)\) return;/);
  assert.match(sdk, /document\.createElement\("script"\)/);
  assert.match(shell, /const visibleNavigation = publicOnly\s*\? navigation\.filter\(item => item\.href === "\/courses" \|\| item\.href === "\/books"\)/);
  assert.match(shell, /\? "\/public" \+ href : href/);
  assert.match(shell, /\{!publicOnly && <AppSaveStatus \/>\}/);
  assert.match(shell, /Public browsing · No sign-in required/);
  assert.match(shell, /publicOnly \? "https:\/\/www\.alveary\.org\/" : alvearyReturnUrl/);
});

console.log("Website public catalogs: separate read-only routes with zero membership probes.");
