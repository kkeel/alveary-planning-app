/** An optimistic parent can open its student editor immediately after
 * clicking + or + All. Combined/nested courses get their included topic
 * editions from the same public catalog shown in Course List, not a second
 * network response. This retains exact parent-course provenance.
 *
 * Prepare_plan is queued before every student/priority write, so the database
 * parent and topic rows exist before dependent writes reach the server.
 * Older single-topic optimistic choices with empty topics remain supported. */
export function canOpenListStudentEditor(choice, courseType, nested = false) {
  if (!choice) return false;
  if (!nested && courseType === "Single-Topic Course") return true;
  return Array.isArray(choice.topics) && choice.topics.length > 0;
}
