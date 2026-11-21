/**
 * Release-scoped ↔ Shared labels. Call this with a SINGLE approved year's
 * resource and course catalogs; never use Airtable's moving Current/Next
 * status formula or match books/courses by display title.
 *
 * A resource assigned to a shared child topic expands into its actual
 * parent-course context(s), preserving the exact edition links. A second
 * publication year must call this again with its own immutable release data.
 */
export function buildBookSharedContexts(bookCatalog, courseCatalog) {
  const byEdition=new Map(courseCatalog.courses.map(course=>
    [course.editionId,course]));
  const parentsByChild=new Map();
  for(const link of courseCatalog.topicLinks) {
    const parent=byEdition.get(link.parentEditionId);
    if(!parent || !byEdition.has(link.childEditionId))continue;
    const parents=parentsByChild.get(link.childEditionId)??new Map();
    parents.set(parent.editionId,parent);
    parentsByChild.set(link.childEditionId,parents);
  }
  const locations=new Map();
  for(const assignment of bookCatalog.assignments) {
    const edition=byEdition.get(assignment.editionId);
    if(!edition)continue;
    const parents=edition.type==="Topic"
      ? [...(parentsByChild.get(edition.editionId)?.values()??[])] : [];
    const paths=parents.length
      ? parents.map(parent=>parent.title+" › "+edition.title)
      : [edition.title];
    for(const resourceId of assignment.resourceIds) {
      const list=locations.get(resourceId)??new Set();
      for(const path of paths)list.add(path);
      locations.set(resourceId,list);
    }
  }
  return new Map([...locations].map(([id,paths])=>[
    id,[...paths].sort((a,b)=>a.localeCompare(b,undefined,{numeric:true}))
  ]));
}
