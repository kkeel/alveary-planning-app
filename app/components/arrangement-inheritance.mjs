/** Four-level arrangement inheritance, matching the priority model:
 * student-topic > shared-topic > student-course > shared-course.
 * "Later" is both the explicit decide-later choice and the fallback when
 * nothing has been set. These reads never rewrite saved defaults. */
export function sharedCourseArrangement(shared,courseId) {
  return shared.find(item=>item.courseId===courseId&&item.topicId===null)?.arrangement??null;
}
export function sharedTopicArrangementOverride(shared,courseId,topicId) {
  return shared.find(item=>item.courseId===courseId&&item.topicId===topicId)?.arrangement??"inherit";
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
  return records.find(item=>item.courseId===courseId&&
    item.studentId===studentId&&item.topicId===null)?.arrangement??
    sharedCourseArrangement(shared,courseId)??"Later";
}
export function topicArrangementOverride(records,courseId,studentId,topicId) {
  return records.find(item=>item.courseId===courseId&&
    item.studentId===studentId&&item.topicId===topicId)?.arrangement??"inherit";
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
