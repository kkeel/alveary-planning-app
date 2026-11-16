import type { SavedCourse, PlanningStudent } from "./DemoPlanContext";
import catalog from "../courses/catalog-preview.json";
import { isTopicAssigned } from "./topic-assignment.mjs";

const titles = new Map(catalog.courses.map(course => [course.id, course.title]));

export type TopicUse = {
  courseId: string;
  courseTitle: string;
  studentNames: string[];
};
export type TopicSharingIndex = Map<string, TopicUse[]>;

/**
 * Only a household's already-authorized, planned, INCLUDED topics count.
 * Compare stable topic edition IDs, not labels or their parent course IDs.
 * A topic must actually be assigned to a student to count as shared.
 */
export function buildTopicSharingIndex(
  courses: SavedCourse[], students: PlanningStudent[],
): TopicSharingIndex {
  const index: TopicSharingIndex = new Map();
  for (const course of courses) {
    if (course.stage !== "planned") continue;
    for (const topic of course.topics) {
      if (!topic.included) continue;
      const studentNames = students.filter(student =>
        isTopicAssigned(course, topic.topicId, student.id)
      ).map(student => student.displayName);
      if (!studentNames.length) continue;
      const existing = index.get(topic.topicEditionId) ?? [];
      existing.push({
        courseId: course.courseId,
        courseTitle: titles.get(course.courseId) ?? "Another planned course",
        studentNames,
      });
      index.set(topic.topicEditionId, existing);
    }
  }
  return index;
}

export function otherUses(
  index: TopicSharingIndex, editionId: string, currentCourseId: string,
): TopicUse[] {
  return (index.get(editionId) ?? []).filter(use => use.courseId !== currentCourseId);
}

export function hasSharedTopic(index: TopicSharingIndex, course: SavedCourse): boolean {
  // A course-only ↔ means its *assigned* topic is also assigned through
  // another grouping. Inclusion in an otherwise unassigned plan is not enough.
  return course.topics.some(topic => topic.included &&
    (index.get(topic.topicEditionId) ?? []).some(use => use.courseId === course.courseId) &&
    otherUses(index, topic.topicEditionId, course.courseId).length > 0);
}
