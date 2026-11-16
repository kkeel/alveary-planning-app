/** One exact source-edition may appear under multiple parent courses.
 * Only included topics in already-saved parent choices may be edited from
 * a cross-course topic editor. Never infer an assignment in a different parent. */
export function savedTopicContexts(courses, topicEditionId) {
  return courses.flatMap(course => {
    const source = course.topics.find(topic =>
      topic.included && topic.topicEditionId === topicEditionId);
    return source ? [{
      courseId: course.courseId,
      topicId: source.topicId,
      stage: course.stage,
    }] : [];
  });
}
