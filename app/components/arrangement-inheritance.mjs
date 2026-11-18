/** Four-level arrangement inheritance, matching the priority model:
 * student-topic > shared-topic > student-course > shared-course.
 * Unset is a valid non-decision. Older "Later" rows act as unset/inherit,
 * never an override that blocks a subsequently chosen parent arrangement.
 * The internal "Later" fallback is kept for existing consumers, not offered
 * as a menu selection. No member records are rewritten by these reads. */
const chosen = value => value === "Later" ? null : value;
export function sharedCourseArrangement(shared,courseId) {
  return chosen(shared.find(item=>item.courseId===courseId&&item.topicId===null)?.arrangement)??null;
}
export function sharedTopicArrangementOverride(shared,courseId,topicId) {
  return chosen(shared.find(item=>item.courseId===courseId&&item.topicId===topicId)?.arrangement)??"inherit";
}
export function sharedTopicArrangement(shared,courseId,topicId) {
  const topic=sharedTopicArrangementOverride(shared,courseId,topicId);
  return topic==="inherit"?sharedCourseArrangement(shared,courseId):topic;
}
export function sharedArrangementSummary(shared,courseId,topicIds) {
  if(!topicIds.length) return sharedCourseArrangement(shared,courseId);
  return arrangementRollup(topicIds.map(id=>sharedTopicArrangement(shared,courseId,id)??"Later"));
}
export function courseArrangement(records,courseId,studentId,shared=[]) {
  return chosen(records.find(item=>item.courseId===courseId&&
    item.studentId===studentId&&item.topicId===null)?.arrangement)??
    sharedCourseArrangement(shared,courseId)??"Later";
}
export function topicArrangementOverride(records,courseId,studentId,topicId) {
  return chosen(records.find(item=>item.courseId===courseId&&
    item.studentId===studentId&&item.topicId===topicId)?.arrangement)??"inherit";
}
export function effectiveArrangement(records,courseId,studentId,topicId=null,shared=[]) {
  if(topicId){
    const studentTopic=topicArrangementOverride(records,courseId,studentId,topicId);
    if(studentTopic!=="inherit") return studentTopic;
    const sharedTopic=sharedTopicArrangementOverride(shared,courseId,topicId);
    if(sharedTopic!=="inherit") return sharedTopic;
  }
  return courseArrangement(records,courseId,studentId,shared);
}
export function arrangementRollup(values) {
  if(!values.length) return null;
  const found=new Set(values.map(value=>value??"Later"));
  return found.size>1?"Varied":[...found][0];
}
