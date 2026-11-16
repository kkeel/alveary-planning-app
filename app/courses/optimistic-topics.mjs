/** Instant visual membership for newly bookmarked course/topic choices.
 * The catalog is public and already rendered in Course List, so local row
 * metadata can be used immediately. The authenticated server remains the
 * authority for persistence, and may replace this preview on confirmation.
 *
 * Do not use this to assign students or change a course's included topics.
 */
export function previewTopicsForCourse(catalog, courseId) {
  const parent=catalog.courses.find(c=>c.id===courseId);
  if (!parent || parent.type==="Topic") return [];
  const byEdition=new Map(catalog.courses.map(c=>[c.editionId,c]));
  const topics=parent.type==="Combined Course"
    ? catalog.topicLinks.filter(l=>l.parentEditionId===parent.editionId)
      .map(l=>byEdition.get(l.childEditionId)).filter(Boolean)
    : [parent];
  return topics.map((topic,index)=>({
    topicId:topic.id,topicEditionId:topic.editionId,
    included:true,order:index,ideaChoice:"inherit",
  }));
}
