import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");
const desk=read("app/components/PlanningDesk.tsx");
const local=read("app/components/PlanningDeskContext.tsx");
const cloud=read("app/components/DemoPlanContext.tsx");
const saveStatus=read("app/components/AppSaveStatus.tsx");

test("A newly saved cloud course is never copied into legacy browser bookmarks", () => {
  assert.doesNotMatch(local,/for\s*\(const saved of cloud\.courses\)/);
  assert.doesNotMatch(local,/ids\.push\(saved\.courseId\)/);
  assert.match(local,/thinkTankIds: \[\], excludedTopicIdsByCourse: \{\}/);
  assert.match(local,/storageScope === "public" \|\| !cloud\.ready/);
});

test("Opening Planning Desk cannot auto-delete cloud courses via legacy bookmark cleanup", () => {
  assert.doesNotMatch(desk,/for\s*\(const id of desk\.thinkTankIds\)\s*desk\.removeIdea\(id\)/);
  // An explicitly clicked Remove action can still use the named handler.
  assert.match(desk,/else desk\.removeIdea\(idea\.id\)/);
  assert.match(desk,/pendingIdeaCount\(choice,cloud\.students\)/);
});

test("Saved is reserved for a completed server-confirmed mutation, not an empty ready state",()=>{
  assert.match(cloud,/const \[confirmedSinceLoad, setConfirmedSinceLoad\] = useState\(false\)/);
  assert.match(cloud,/request\(action, fields\)/);
  assert.match(cloud,/setConfirmedSinceLoad\(true\)/);
  assert.match(saveStatus,/ready \? \(confirmedSinceLoad \? "saved" : "ready"\)/);
  assert.match(saveStatus,/state === "ready" \? "Ready"/);
  assert.match(saveStatus,/The latest change was confirmed by the server/);
});
