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
