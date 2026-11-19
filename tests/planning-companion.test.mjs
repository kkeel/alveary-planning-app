import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const shell = read("app/components/AppShell.tsx");
const home = read("app/components/PlanningOverview.tsx");
const page = read("app/components/PlanningCompanionPage.tsx");
const panel = read("app/components/PlanningCompanionPanel.tsx");
const guide = read("app/components/PlanningCompanionGuide.tsx");
const provider = read("app/components/PlanningCompanionContext.tsx");
const css = read("app/components/planning-companion.css");
const desk = read("app/components/PlanningDesk.tsx");
const listPreferences = read("app/components/PlanningDeskContext.tsx");

test("Companion can be reached from Planning Overview but stays member-only", () => {
  assert.match(home, /href="\/companion"/);
  assert.match(home, /Help me think it through/);
  assert.match(home, /Continue my planning/);
  assert.match(shell, /"\/companion", label: "Planning Companion"/);
  assert.match(shell, /memberOnlyPaths = new Set\(\["\/companion"/);
  assert.match(shell, /<PlanningCompanionProvider key=\{userId \?\? "public"\}/);
  assert.match(shell, /<PlanningCompanionPanel \/>/);
  assert.match(shell, /<PlanningDesk \/>/);
  assert.match(shell, /activePath === "\/courses"/);
});

test("Welcome-to-Course List handoff restores the exact guide section", () => {
  assert.match(page, /companion\.openGuide\(\);\s*router\.push\("\/courses"\);/);
  assert.match(page, /desk\.setCourseMode\("browse"\)/);
  assert.match(page, /desk\.setTab\("plan"\)/);
  assert.doesNotMatch(page, /desk\.setCourseMode\("plan"\)/,
    "Browsing with guidance must not accidentally open the full two-column Planning Desk");
  assert.match(provider, /section: isSection\(saved\.section\) \? saved\.section : "welcome"/);
  assert.match(guide, /"priorities\/core"/);
  assert.match(guide, /"priorities\/interest"/);
  assert.match(guide, /"priorities\/additional"/);
  assert.match(guide, /None of these labels is required/);
  assert.match(listPreferences, /listDetails: "detailed", thinkDetails: "topics", planDetails: "topics"/);
});

test("The companion offers open, minimized, closed and one quiet tip", () => {
  assert.match(provider, /visibility: "minimized"/);
  assert.match(provider, /visibility: "closed"/);
  assert.match(provider, /tipPending: true/);
  assert.match(provider, /previousCourseCount\.current === null/);
  assert.match(provider, /previousCourseCount\.current === 0 && currentCount > 0/);
  assert.match(provider, /firstChoiceTipSeen: true/);
  assert.match(panel, /companion\.openCompanion/);
  assert.match(panel, /className="pc-panel is-open"/);
  assert.match(panel, /className=\{"pc-minimized"/);
  assert.match(panel, /companion\.minimize/);
  assert.match(panel, /companion\.close/);
  assert.match(panel, /companion\.dismissTip/);
  assert.match(panel, /aria-label="Reopen Planning Companion"/);
});

test("Companion lives above mini desk and respects the narrow drawer pattern", () => {
  const panelIndex = shell.indexOf("<PlanningCompanionPanel />");
  const miniIndex = shell.indexOf("<PlanningDesk />", panelIndex);
  assert.ok(panelIndex > 0 && miniIndex > panelIndex);
  assert.match(css, /\.shell-planning-rail \{[\s\S]*?position:sticky;/);
  assert.match(css, /\.shell-planning-rail > \.pd-wrapper \{ position:static;/);
  assert.match(css, /@container planning-workspace \(max-width:810px\)/);
  assert.match(css, /\.shell-planning-rail \.pc-panel\.is-open \{/);
  assert.match(css, /\.shell-planning-rail:has\(\.pc-panel\.is-open\) \.pd-mobile-launcher \{ display:none; \}/);
  assert.match(desk, /companion\.visibility === "open" && drawerOpen/);
});

test("Companion is the singular Compass shortcut, not a duplicate navigation item", () => {
  const navStart = shell.indexOf("const navigation: NavItem[] = [");
  const navEnd = shell.indexOf("];",navStart);
  const nav = shell.slice(navStart,navEnd);
  assert.doesNotMatch(nav,/href: "\/companion"/,
    "Companion must not appear as an ordinary navigation item as well");
  assert.match(shell,/const companionItem: NavItem = \{ href: "\/companion", label: "Planning Companion"/);
  assert.match(shell,/<Link className=\{"sidebar-prep" \+ \(activePath === "\/companion"/);
  assert.match(shell,/href="\/companion" aria-current=\{activePath === "\/companion"/);
  assert.match(shell,/<Compass size=\{17\} strokeWidth=\{1\.6\}/);
  assert.match(shell,/<span>Planning Companion<\/span>/);
  assert.match(shell,/chooseSection\("welcome"\); setMobileOpen\(false\)/);
  assert.doesNotMatch(shell,/Prepare your school year/);
  assert.match(shell,/\[\.\.\.navigation, \.\.\.planningItems, companionItem\]/,
    "Companion remains discoverable in search and breadcrumbs");
});

test("Overview Help me think it through opens priorities immediately, while guidance can return to Companion home", () => {
  const page = read("app/components/PlanningCompanionPage.tsx");
  assert.match(home, /href="\/companion" onClick=\{\(\) => companion\.chooseSection\("priorities\/core"\)\}/);
  assert.doesNotMatch(home,/href="\/companion" onClick=\{\(\) => companion\.chooseSection\("welcome"\)\}/);
  assert.match(page, /companion\.section === "welcome" \? <CompanionWelcome/);
  assert.match(page, /companion\.chooseSection\("welcome"\)/);
  assert.doesNotMatch(page, /pc-overview-back|ALVEARY PLANNING/,
    "Page navigation and breadcrumbs already provide the way back");
  assert.match(page, /<h1>Your Planning Companion<\/h1>/);
});

test("Companion colors come from established Alveary tokens rather than a parallel palette", () => {
  const mainCss = read("app/globals.css");
  assert.match(mainCss,/--paper: #faf7ed;/);
  assert.match(mainCss,/--sage: #596e5e;/);
  assert.match(mainCss,/--olive: #adb58f;/);
  assert.match(mainCss,/\.sidebar-prep\.is-active \{/);
  // The shared page shell supplies the warm paper background; the
  // Companion must not add its own page-sized background or margins.
  assert.match(mainCss,/\.shell-workspace \{[^\n]*background: var\(--paper\)/);
  for(const token of ["--surface","--ink","--sage","--sage-light","--olive","--line"]) {
    assert.ok(css.includes("var("+token+")"),"Companion should use existing "+token+" token");
  }
  assert.match(css,/\.pc-priority-guidance \{[^}]*background:#fbfbf9;/,
    "The user-requested near-white reading surface is the one deliberate exception");
  assert.doesNotMatch(css.replace(/#fbfbf9/gi,""),/#[a-f\d]{3,8}\b/i,
    "Companion should not introduce other competing hard-coded colors");
});

test("Companion page matches the ordinary page layout without redundant navigation", () => {
  const styles = read("app/components/planning-companion.css");
  const globalStyles = read("app/globals.css");
  const guide = read("app/components/PlanningCompanionGuide.tsx");
  assert.match(globalStyles,/\.shell-main \{ flex: 1; padding: 45px 44px 70px;/);
  assert.match(globalStyles,/h1 \{ font-size: clamp\(32px, 2\.4vw, 39px\)/);
  assert.match(page, /<h1>Your Planning Companion<\/h1>/);
  assert.match(page, /<p className="lead">/);
  assert.match(styles,/\.pc-workspace \{ width:100%; min-width:0; color:var\(--ink\); \}/);
  assert.doesNotMatch(styles,/\.pc-workspace-heading h1\s*\{/,
    "The Companion h1 must inherit standard page typography");
  assert.doesNotMatch(styles,/\.pc-workspace-heading h1 \{ font-size:/);
  assert.doesNotMatch(page,/ALVEARY PLANNING|pc-overview-back|Planning Overview/);
  assert.doesNotMatch(page,/pc-workspace-next|Go to Course List|Already know what you want\?/);
  assert.doesNotMatch(styles,/\.pc-workspace-next/);
  assert.match(guide,/export function CourseListIcon/);
  assert.match(guide,/<polygon points="5\.5 20 18 20 19\.5 18\.5 19\.5 3\.5 18 2 5\.5 2 5\.5 20"\/>/);
  const continueButton = guide.slice(guide.indexOf('<button type="button" onClick={onContinue}>'));
  assert.ok(continueButton.startsWith('<button type="button" onClick={onContinue}>'));
  assert.match(continueButton,/^<button type="button" onClick=\{onContinue\}>\s*<CourseListIcon\/>/);
  assert.match(continueButton,/Continue my planning/);
  assert.equal((continueButton.match(/<ArrowRight/g)||[]).length,1,
    "Continue should have only one directional arrow, after its label");
  assert.match(home,/<CourseListIcon size=\{17\}\/> Continue my planning/);
});

test("Priority guidance uses existing Alveary illustrations and quieter question icon", () => {
  const shared = read("app/components/SharedPriorityEditor.tsx");
  assert.match(shared,/Core%20Subjects\.png/);
  assert.match(shared,/High%20Interest%20Subjects\.png/);
  assert.match(shared,/Additional%20Subjects\.png/);
  assert.match(guide,/import \{ PrioritySymbol \} from "\.\/SharedPriorityEditor";/);
  assert.match(guide,/<PrioritySymbol priority=\{item\.label\} size=\{22\}\/>/,
    "Each priority toggle should show its corresponding Alveary illustration");
  assert.match(guide,/<PrioritySymbol priority=\{selected\.label\} size=\{compact \? 43 : 58\}\/>/,
    "The tip card must show the selected category's actual artwork");
  assert.match(guide,/<MessageCircleQuestion size=\{18\} aria-hidden="true"\/>/);
  assert.doesNotMatch(guide,/Sparkles/,
    "The reflection question should not use decorative stars");
  assert.doesNotMatch(page,/<BookOpen|import \{ ArrowLeft, BookOpen/,
    "Choosing your priorities needs a title but no decorative book icon");
  assert.match(css,/\.pc-reflection \{[^}]*background:color-mix\(in srgb,var\(--sage-light\) 42%,var\(--surface\)\)/);
});

test("Companion keeps the Course Planning Guide's concrete examples and verified resource links", () => {
  for(const phrase of [
    "A Charlotte Mason education should fit the child",
    "feast of learning, and the Course List is your menu",
    "English/Reading, Literature, Science, and Math",
    "one History stream",
    "2nd and 3rd graders",
    "Shakespeare, Plutarch, and Composer Study",
    "Art Instruction and Singing",
    "high school credit requirements",
    "cooking or car maintenance",
    "co-op classes or ACT preparation",
    "Alveary scheduling tools",
    "keep a list of what interests you and why",
  ]) assert.ok(guide.includes(phrase), "Missing Course Planning Guide content: " + phrase);
  for(const url of [
    "https://www.alveary.org/whats-new/a-relational-education",
    "https://www.alveary.org/whats-new/balancing-the-feast",
    "https://www.alveary.org/whats-new/tips-for-combining-students",
    "https://planning.alveary.org/",
  ]) assert.ok(guide.includes(url), "Missing verified Alveary resource link: " + url);
  assert.match(guide,/<details className="pc-resources" open=\{!compact\}>/,
    "Resource links should remain accessible without crowding the small mini desk");
  assert.match(guide,/rel="noopener noreferrer"/);
});
