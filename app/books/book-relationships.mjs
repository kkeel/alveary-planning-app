import { topicHasAssignedStudent } from "../components/topic-assignment.mjs";

/**
 * All transformations operate on the already-sanitized public preview.
 * No private URLs are ever read in the browser.
 */
export function booksForEditions(bookCatalog, editionIds) {
  const included = new Set(editionIds);
  const resources = new Map(bookCatalog.resources.map(resource =>
    [resource.id, { ...resource, uses: [] }]));
  for (const assignment of bookCatalog.assignments) {
    if (!included.has(assignment.editionId)) continue;
    for (const id of assignment.resourceIds) {
      const item = resources.get(id);
      if (item) item.uses.push({
        assignmentId: assignment.id,
        editionId: assignment.editionId,
        role: assignment.role,
        optional: assignment.optional,
        chooseOne: assignment.chooseOne,
        term1: assignment.term1,
        term2: assignment.term2,
        term3: assignment.term3,
        choiceCount: assignment.resourceIds.length,
      });
    }
  }
  return [...resources.values()].filter(resource => resource.uses.length)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, {numeric:true}));
}

export function allBooks(bookCatalog) {
  return booksForEditions(bookCatalog,bookCatalog.assignments.map(a => a.editionId));
}

/**
 * Parent focus displays resources assigned directly to its edition plus every
 * authored child edition. Topic focus includes its parent-level shared books
 * and only that selected topic, never sibling topic resources.
 */
export function editionIdsForFocus(courseCatalog, courseId, topicId = null) {
  const byId = new Map(courseCatalog.courses.map(c => [c.id,c]));
  const course = byId.get(courseId);
  if (!course) return [];
  if (course.type === "Topic") return topicId ? [] : [course.editionId];
  const childEditionIds = courseCatalog.topicLinks
    .filter(l => l.parentEditionId === course.editionId)
    .map(l => l.childEditionId);
  if (topicId) {
    const child = byId.get(topicId);
    return child && childEditionIds.includes(child.editionId)
      ? [course.editionId,child.editionId] : [];
  }
  return [...new Set([course.editionId,...childEditionIds])];
}

export function booksForFocus(bookCatalog,courseCatalog,courseId,topicId=null) {
  return booksForEditions(bookCatalog,editionIdsForFocus(courseCatalog,courseId,topicId));
}

/** Respect the student's actual topic assignment, not a Think Tank idea. */
export function editionIdsForMyPlan(courseCatalog,savedCourses,students) {
  const byId=new Map(courseCatalog.courses.map(c=>[c.id,c]));
  const selections=new Set();
  for(const saved of savedCourses) {
    if(saved.stage!=="planned")continue;
    const course=byId.get(saved.courseId);
    if(!course)continue;
    const included=(saved.topics||[]).filter(topic =>
      topic.included && topicHasAssignedStudent(saved,topic.topicId,students));
    // Published parent-edition book assignments apply whenever its course
    // appears in My Plan, including partially selected combined courses.
    selections.add(course.editionId);
    for(const topic of included) {
      const linked = byId.get(topic.topicId);
      const edition = linked?.editionId ?? topic.topicEditionId;
      // Match only authored parent/child composition; no title joins.
      const isLinked=courseCatalog.topicLinks.some(l =>
        l.parentEditionId===course.editionId && l.childEditionId===edition);
      if(isLinked)selections.add(edition);
    }
  }
  return [...selections];
}

export function booksForMyPlan(bookCatalog,courseCatalog,savedCourses,students) {
  return booksForEditions(bookCatalog,
    editionIdsForMyPlan(courseCatalog,savedCourses,students));
}

export function bookNeededInTerm(book,term) {
  if(term==="all")return true;
  return book.uses.some(use => use["term"+term] != null);
}

/** Preserve authored scope (Selections, Full Term, etc.) just as the
 * previous Book List did. This describes lesson usage, not buying status. */
export function bookTermSummary(book) {
  const terms=[1,2,3].map(number=>({
    number, scopes:[...new Set(book.uses
      .map(use=>use["term"+number]).filter(Boolean))]
  })).filter(t=>t.scopes.length);
  if(!terms.length)return "Term not specified";
  const allSame=terms.every(t=>t.scopes.length===1 &&
    t.scopes[0]===terms[0].scopes[0]);
  if(allSame && terms.length>1) {
    const numbers=terms.map(t=>t.number);
    return "Terms "+numbers.join(", ")+" ("+terms[0].scopes[0]+")";
  }
  return terms.map(t=>"Term "+t.number+
    (t.scopes.length?" ("+t.scopes.join(" / ")+")":"")).join(" · ");
}

/** Avoid repeating a generic public-link warning when an approved,
 * already-published note clearly explains the member-only restriction. */
export function noteExplainsMemberAccess(note) {
  return typeof note === "string" &&
    /(?:\bmembers?[-\s]+only\b|\bonly\s+available\s+to\s+(?:alveary\s+)?members?\b|\bonly\s+for\s+(?:alveary\s+)?members?\b)/i.test(note);
}
