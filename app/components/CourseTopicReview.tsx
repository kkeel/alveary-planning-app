"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Info, Lightbulb, Minus, Plus, RotateCcw, UserRoundPen } from "lucide-react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { sortTopicsForCourse } from "../courses/topic-order.mjs";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import SharedTopicStudentEditor from "./SharedTopicStudentEditor";
import { buildTopicSharingIndex, otherUses, type TopicSharingIndex } from "./topic-sharing";
import catalog from "../courses/catalog-preview.json";

type CatalogCourse = (typeof catalog.courses)[number];
const byEdition = new Map(catalog.courses.map(course => [course.editionId, course]));
const links = new Map<string, CatalogCourse[]>();
for (const item of catalog.topicLinks) {
  const topic = byEdition.get(item.childEditionId);
  if (!topic) continue;
  links.set(item.parentEditionId, [...(links.get(item.parentEditionId) ?? []), topic]);
}

/** Names only in the overview. Course provenance is available in Edit. */
export function TopicOtherUses({
  topicEditionId, parentCourseId, index,
}: { topicEditionId: string; parentCourseId: string; index: TopicSharingIndex }) {
  const uses = otherUses(index, topicEditionId, parentCourseId);
  const students = [...new Set(uses.flatMap(use => use.studentNames))];
  if (!students.length) return null;
  return <div className="pd-topic-sharing" title="This topic is also assigned through another course grouping">
    <span aria-hidden="true">↔</span> {students.join(", ")}
  </div>;
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
  const [infoTopicId, setInfoTopicId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [planningTopicId, setPlanningTopicId] = useState<string | null>(null);
  const [removedOpen, setRemovedOpen] = useState(false);

  const combined = parent.type === "Combined Course";
  const children = useMemo(() => combined
    ? sortTopicsForCourse(parent, links.get(parent.editionId) ?? []) : [],
  [combined, parent]);

  if (!combined || !children.length) {
    return mode === "plan" && savedChoice?.topics[0]
      ? <div className="pd-single-topic-sharing">
          <TopicOtherUses parentCourseId={parent.id}
            topicEditionId={savedChoice.topics[0].topicEditionId} index={sharingIndex}/>
        </div> : null;
  }

  function excluded(topicId: string) {
    const persisted = savedChoice?.topics.find(t => t.topicId === topicId);
    return mode === "think" && excludedTopicIds.length
      ? excludedTopicIds.includes(topicId)
      : persisted ? !persisted.included : excludedTopicIds.includes(topicId);
  }
  const included = children.filter(topic => !excluded(topic.id));
  const removed = children.filter(topic => excluded(topic.id));

  function renderTopic(topic: CatalogCourse, isRemoved = false) {
    const open = openedTopicId === topic.id;
    const infoOpen = infoTopicId === topic.id;
    const editing = editingTopicId === topic.id;
    const standalone = demo.courses.find(course => course.courseId === topic.id);
    const planning = planningTopicId === topic.id;
    const hasAssignedStudent = Boolean(standalone && standalone.stage === "planned" &&
      (standalone.studentIds.length || standalone.overrides.some(o => o.assigned)));

    return <div className={"pd-topic-item" + (isRemoved ? " is-excluded" : "")} key={topic.editionId}>
      <div className="pd-topic-row">
        <button type="button" className="pd-topic-toggle" aria-expanded={open}
          onClick={() => setOpenedTopicId(open ? null : topic.id)}>
          {open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
          <span>{topic.title}</span>
        </button>
        {(topic.description || topic.tips) && <button type="button" className="pd-topic-icon"
          aria-label={"Information and tips for " + topic.title} title="Description & tips"
          aria-expanded={infoOpen}
          onClick={() => setInfoTopicId(infoOpen ? null : topic.id)}>
          <Info size={14} aria-hidden="true"/>
        </button>}
        <Link className="pd-topic-icon" href={"/books?course=" + encodeURIComponent(topic.id)}
          aria-label={"View books for " + topic.title} title="View books">
          <BookOpen size={14} aria-hidden="true"/>
        </Link>
        {mode === "think" && !isRemoved && demo.ready &&
          <button type="button" className="pd-topic-icon pd-topic-add"
            aria-label={"Plan only " + topic.title} title="Plan only this topic"
            onClick={() => {
              if (standalone?.stage !== "planned") demo.planTopic(topic.id);
              setPlanningTopicId(topic.id);
            }}>
            <Plus size={15} aria-hidden="true"/>
          </button>}
        <button type="button" className="pd-topic-icon pd-topic-remove"
          aria-label={(isRemoved ? "Restore " : "Exclude ") + topic.title + " in " + parent.title}
          title={isRemoved ? "Restore topic" : "Exclude topic"}
          onClick={() => onToggleTopic(topic.id, isRemoved)}>
          {isRemoved ? <RotateCcw size={14}/> : <Minus size={14}/>}
        </button>
      </div>
      <TopicOtherUses topicEditionId={topic.editionId}
        parentCourseId={parent.id} index={sharingIndex}/>
      {infoOpen && <div className="pd-topic-info">
        {topic.description && <p>{topic.description}</p>}
        {topic.tips && <div className="pd-topic-tips">
          <Lightbulb size={15} aria-hidden="true"/><p>{topic.tips}</p>
        </div>}
      </div>}
      {open && mode === "plan" && savedChoice && !isRemoved && <div className="pd-topic-edit-section">
        <button type="button" className="pd-inline-edit" aria-expanded={editing}
          onClick={() => setEditingTopicId(editing ? null : topic.id)}>
          <UserRoundPen size={14} aria-hidden="true"/> {editing ? "Done" : "Edit"} students
        </button>
        {editing && <SharedTopicStudentEditor
          topicEditionId={topic.editionId} currentCourseId={parent.id}/>}
      </div>}
      {planning && standalone && <div className="pd-topic-plan-inline">
        <div className="pd-assignment-title">
          <strong>Plan this topic</strong>
          <button type="button" className="pd-inline-edit"
            onClick={() => setPlanningTopicId(null)}>Hide</button>
        </div>
        <StudentAssignmentEditor course={standalone}/>
        {hasAssignedStudent && <div className="pd-topic-plan-footer">
          <span>Only this topic moves to My Plan. The rest of the combined course stays in Think Tank.</span>
          <button type="button" disabled={demo.saving || Boolean(demo.error)}
            onClick={() => setPlanningTopicId(null)}>Done</button>
        </div>}
      </div>}
    </div>;
  }

  return <div className="pd-topic-review" aria-label={"Topics in " + parent.title}>
    <div className="pd-topic-review-heading">
      <strong>Topics{removed.length > 0
        ? " · Customized: " + included.length + " of " + children.length + " included"
        : ""}</strong>
      {mode === "plan" && <small>Topics remain individually schedulable and printable</small>}
    </div>
    {included.map(topic => renderTopic(topic))}
    {!included.length && <p className="pd-topic-zero">No topics included yet.</p>}
    {!!removed.length && <div className="pd-removed">
      <button type="button" className="pd-removed-toggle" aria-expanded={removedOpen}
        onClick={() => setRemovedOpen(value => !value)}>
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
