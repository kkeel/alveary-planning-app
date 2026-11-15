"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { sortTopicsForCourse } from "../courses/topic-order.mjs";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import { buildTopicSharingIndex, otherUses, type TopicSharingIndex } from "./topic-sharing";
import catalog from "../courses/catalog-preview.json";

type CatalogCourse = (typeof catalog.courses)[number];
const byId = new Map(catalog.courses.map(c => [c.id, c]));
const byEdition = new Map(catalog.courses.map(c => [c.editionId, c]));
const links = new Map<string, CatalogCourse[]>();
for (const item of catalog.topicLinks) {
  const topic = byEdition.get(item.childEditionId);
  if (!topic) continue;
  links.set(item.parentEditionId, [...(links.get(item.parentEditionId) ?? []), topic]);
}

/** Effective assignment for a topic, including explicit per-student exceptions. */
function isTopicAssigned(course: SavedCourse, topicId: string, studentId: string): boolean {
  const special = course.overrides.find(o => o.topicId === topicId && o.studentId === studentId);
  return special ? special.assigned : course.studentIds.includes(studentId);
}

/** A concise inline summary. The detailed course/student mapping is in the tooltip. */
export function TopicOtherUses({
  topicEditionId, parentCourseId, index,
}: { topicEditionId: string; parentCourseId: string; index: TopicSharingIndex }) {
  const uses = otherUses(index, topicEditionId, parentCourseId);
  if (!uses.length) return null;
  const summary = uses.map(use => use.studentNames.join(", ") +
    " (" + use.courseTitle + ")").join("; ");
  return <small className="pd-topic-sharing" title={"Also assigned in: " + summary}>
    <span aria-hidden="true">↔</span> {summary}
  </small>;
}

type Props = {
  parent: CatalogCourse;
  savedChoice?: SavedCourse;
  mode: "think" | "plan";
  excludedTopicIds?: string[];
  onToggleTopic: (topicId: string, included: boolean) => void;
};

export default function CourseTopicReview({
  parent, savedChoice, mode, excludedTopicIds = [], onToggleTopic,
}: Props) {
  const demo = useDemoPlan();
  const sharingIndex = useMemo(() => buildTopicSharingIndex(demo.courses, demo.students),
    [demo.courses, demo.students]);
  const [openedTopicId, setOpenedTopicId] = useState<string | null>(null);
  const [editingStudentsId, setEditingStudentsId] = useState<string | null>(null);
  const [planningTopicId, setPlanningTopicId] = useState<string | null>(null);
  const [removedOpen, setRemovedOpen] = useState(false);

  // A single-topic course already IS its topic. Don't repeat its title in a
  // fake nested row just to expose the same controls a second time.
  const isCombined = parent.type === "Combined Course";
  const children = useMemo(() => isCombined
    ? sortTopicsForCourse(parent, links.get(parent.editionId) ?? []) : [],
  [isCombined, parent]);
  if (!isCombined || !children.length) {
    return mode === "plan" && savedChoice?.topics[0]
      ? <div className="pd-single-topic-sharing">
          <TopicOtherUses parentCourseId={parent.id}
            topicEditionId={savedChoice.topics[0].topicEditionId} index={sharingIndex}/>
        </div> : null;
  }

  const excluded = (topicId: string) => {
    const persisted = savedChoice?.topics.find(t => t.topicId === topicId);
    // The local Think Tank exclusion is authoritative until the member
    // finishes importing that browser's previous customizations.
    return mode === "think" && excludedTopicIds.length
      ? excludedTopicIds.includes(topicId)
      : persisted ? !persisted.included : excludedTopicIds.includes(topicId);
  };
  const included = children.filter(topic => !excluded(topic.id));
  const removed = children.filter(topic => excluded(topic.id));
  const renderTopic = (topic: CatalogCourse, isRemoved = false) => {
    const open = openedTopicId === topic.id;
    const standalone = demo.courses.find(c => c.courseId === topic.id);
    const beingPlanned = planningTopicId === topic.id;
    const canPlan = mode === "think" && demo.ready;
    const savedParent = savedChoice;
    return <div className={"pd-topic-item" + (isRemoved ? " is-excluded" : "")} key={topic.editionId}>
      <div className="pd-topic-row">
        <button type="button" className="pd-topic-toggle" aria-expanded={open}
          onClick={() => setOpenedTopicId(open ? null : topic.id)}>
          {open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
          <span>{topic.title}
            {standalone?.stage === "planned" && <small className="pd-topic-saved-note">Also in My Plan separately</small>}
            <TopicOtherUses topicEditionId={topic.editionId} parentCourseId={parent.id}
              index={sharingIndex}/>
          </span>
        </button>
        {canPlan && !isRemoved && open && <button type="button" className="pd-topic-plan"
          onClick={() => {
            if (standalone?.stage !== "planned") demo.planTopic(topic.id);
            setPlanningTopicId(topic.id);
            setOpenedTopicId(topic.id);
          }}>{standalone?.stage === "planned" ? "Edit plan" : "Plan this topic"}</button>}
        <button type="button" className="pd-topic-choice"
          aria-label={(isRemoved ? "Restore " : "Remove ") + topic.title + " in " + parent.title}
          onClick={() => onToggleTopic(topic.id, isRemoved)}>
          {isRemoved ? "Restore" : "Remove"}
        </button>
      </div>
      {open && <div className="pd-topic-info">
        {topic.description && <p>{topic.description}</p>}
        {topic.tips && <p>{topic.tips}</p>}
        {mode === "plan" && savedParent && !isRemoved && <>
          <button type="button" className="pd-inline-edit" aria-expanded={editingStudentsId === topic.id}
            onClick={() => setEditingStudentsId(editingStudentsId === topic.id ? null : topic.id)}>
            {editingStudentsId === topic.id ? "Done editing topic students" : "Edit students for this topic"}
          </button>
          {editingStudentsId === topic.id && <div className="pd-topic-assignees">
            {demo.students.map(student => {
              const checked = isTopicAssigned(savedParent, topic.id, student.id);
              return <label key={student.id}>
                <input type="checkbox" checked={checked}
                  onChange={event => demo.assignTopic(parent.id, topic.id, student.id, event.target.checked)}/>
                {student.displayName}
              </label>;
            })}
            {!demo.students.length && <p>Add students when you&apos;re ready.</p>}
          </div>}
        </>}
      </div>}
      {beingPlanned && standalone && <div className="pd-topic-plan-inline">
        <StudentAssignmentEditor course={standalone}/>
        <div className="pd-topic-plan-footer">
          <span>This topic is a separate My Plan choice; the rest of the combined course stays in Think Tank.</span>
          <button type="button" disabled={demo.saving || Boolean(demo.error)}
            onClick={() => setPlanningTopicId(null)}>Done</button>
        </div>
      </div>}
    </div>;
  };
  return <div className="pd-topic-review" aria-label={"Topics in " + parent.title}>
    <div className="pd-topic-review-heading">
      <strong>Topics · {included.length} of {children.length}</strong>
      {mode === "plan" && <small>Each can be scheduled or printed separately</small>}
    </div>
    {included.map(topic => renderTopic(topic))}
    {!included.length && <p className="pd-topic-zero">No topics included yet.</p>}
    {!!removed.length && <div className="pd-removed">
      <button type="button" className="pd-removed-toggle" aria-expanded={removedOpen}
        onClick={() => setRemovedOpen(open => !open)}>
        {removedOpen ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        {removed.length} removed · {removedOpen ? "Hide" : "Restore"}
      </button>
      {removedOpen && <div className="pd-removed-list">
        {removed.map(topic => renderTopic(topic, true))}
        <button type="button" className="pd-restore-topics"
          onClick={() => removed.forEach(topic => onToggleTopic(topic.id, true))}>
          <RotateCcw size={12}/> Restore all
        </button>
      </div>}
    </div>}
  </div>;
}
