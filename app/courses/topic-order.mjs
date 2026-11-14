/**
 * Sort topic editions in the context of a *particular parent course*.
 *
 * Source Airtable Plan Sort stays unchanged. A Literature topic (Community
 * Read Alouds) can be included in Citizenship: its Literature subject prefix
 * would sort before every Citizenship topic unless we apply this contextual
 * rule. This function is pure and works on future imported editions too.
 *
 * @template {{ id: string, title: string, sort: string }} T
 * @param {{ subject: string }} parent
 * @param {readonly T[]} topics
 * @returns {T[]}
 */
export function sortTopicsForCourse(parent, topics) {
  const position = (topic) => {
    if (parent.subject !== "Citizenship") return 0;
    const title = topic.title.toLocaleLowerCase().trim();
    if (title.startsWith("community read alouds")) return 2;
    if (title.startsWith("current events")) return 1;
    return 0;
  };
  return [...topics].sort((a, b) => (
    position(a) - position(b) ||
    (a.sort < b.sort ? -1 : a.sort > b.sort ? 1 : 0) ||
    (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
  ));
}
