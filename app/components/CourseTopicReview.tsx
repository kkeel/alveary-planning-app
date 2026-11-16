"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Info, MoreHorizontal, Plus, RotateCcw, UsersRound } from "lucide-react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { sortTopicsForCourse } from "../courses/topic-order.mjs";
import { topicHasAssignedStudent } from "./topic-assignment.mjs";
import StudentAssignmentEditor from "./StudentAssignmentEditor";
import PlacementSymbol from "./PlacementSymbol";
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
  onTopicAssigned?: () => void;
  onTopicDone?: () => void;
};

export default function CourseTopicReview({
  parent, savedChoice, mode, excludedTopicIds = [], onToggleTopic,
  onTopicAssigned, onTopicDone,
}: Props) {
  const demo = useDemoPlan();
  const sharingIndex = useMemo(() => buildTopicSharingIndex(demo.courses, demo.students),
    [demo.courses, demo.students]);
  const [infoTopicId, setInfoTopicId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [planningTopicId, setPlanningTopicId] = useState<string | null>(null);
  const [removedOpen, setRemovedOpen] = useState(false);
  const [topicMenuId, setTopicMenuId] = useState<string | null>(null);

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
  // The same saved combined course can have unfinished topics in Think Tank
  // and assigned topics in My Plan; neither side is a duplicated choice.
  const assignedInThisCourse = (topic: CatalogCourse) =>
    Boolean(savedChoice && topicHasAssignedStudent(savedChoice, topic.id, demo.students));
  const included = children.filter(topic => !excluded(topic.id) &&
    (savedChoice?.stage !== "planned" ||
      (mode === "think"
        ? !assignedInThisCourse(topic) || planningTopicId === topic.id
        : assignedInThisCourse(topic) || editingTopicId === topic.id)));
  const removed = children.filter(topic => excluded(topic.id));
  const totalIncluded = children.length - removed.length;

  function renderTopic(topic: CatalogCourse, isRemoved = false) {
    const infoOpen = infoTopicId === topic.id;
    const hasDetails = Boolean(topic.description || topic.tips);
    const toggleInfo = () => setInfoTopicId(infoOpen ? null : topic.id);
    const detailsId = "pd-topic-details-" + parent.id + "-" + topic.id;
    const editing = editingTopicId === topic.id;
    const linkedTopic = savedChoice?.topics.find(item => item.topicId === topic.id && item.included);
    const planning = planningTopicId === topic.id;
    const menuOpen = topicMenuId === topic.id;

    return <div className={"pd-topic-item" + (isRemoved ? " is-excluded" : "")} key={topic.editionId}>
      <div className="pd-topic-row">
        {hasDetails
          ? <button type="button" className="pd-topic-name pd-topic-title-button"
              aria-label={(infoOpen ? "Hide" : "Show") + " description and tips for " + topic.title}
              aria-expanded={infoOpen} aria-controls={detailsId} onClick={toggleInfo}>
              {topic.title}
            </button>
          : <span className="pd-topic-name">{topic.title}</span>}
        {hasDetails && <button type="button" className="pd-topic-icon"
          aria-label={(infoOpen ? "Hide" : "Show") + " description and tips for " + topic.title}
          title="Description & tips" aria-expanded={infoOpen}
          aria-controls={detailsId} onClick={toggleInfo}>
          <Info size={14} aria-hidden="true"/>
        </button>}
        {mode === "plan" && savedChoice && !isRemoved &&
          <button type="button" className="pd-topic-icon pd-topic-edit"
            aria-label={"Edit students for " + topic.title} title="Edit students"
            aria-expanded={editing}
            onClick={() => setEditingTopicId(editing ? null : topic.id)}>
            <UsersRound size={15} aria-hidden="true"/>
          </button>}
        {mode === "think" && !isRemoved && demo.ready &&
          <button type="button" className="pd-topic-icon pd-topic-add"
            aria-label={"Add students to " + topic.title + " in " + parent.title}
            title={linkedTopic ? "Add students to this topic" :
              "Save this course to Think Tank before assigning"}
            aria-expanded={planning}
            disabled={!linkedTopic}
            onClick={() => setPlanningTopicId(planning ? null : topic.id)}>
            <Plus size={15} aria-hidden="true"/>
          </button>}
        <button type="button" className="pd-topic-icon pd-topic-more"
          aria-label={"More options for " + topic.title} title="More options"
          aria-expanded={menuOpen}
          onClick={() => setTopicMenuId(menuOpen ? null : topic.id)}>
          <MoreHorizontal size={16} aria-hidden="true"/>
        </button>
      </div>
      {menuOpen && <div className="pd-topic-menu" role="group"
        aria-label={"More options for " + topic.title}>
        <Link href={"/books?course=" + encodeURIComponent(topic.id)}
          onClick={() => setTopicMenuId(null)}>
          <BookOpen size={14} aria-hidden="true"/> View books
        </Link>
        <button type="button" onClick={() => {
          onToggleTopic(topic.id, isRemoved);
          setTopicMenuId(null);
        }}>
          {isRemoved ? <RotateCcw size={14} aria-hidden="true"/> :
            <span aria-hidden="true">−</span>}
          {isRemoved ? "Restore to course" : "Remove from course"}
        </button>
      </div>}
      <TopicOtherUses topicEditionId={topic.editionId}
        parentCourseId={parent.id} index={sharingIndex}/>
      {infoOpen && <div className="pd-topic-info" id={detailsId}>
        {topic.description && <p>{topic.description}</p>}
        {topic.tips && <div className="pd-topic-tips">
          <PlacementSymbol size={17}/><p>{topic.tips}</p>
        </div>}
      </div>}
      {editing && mode === "plan" && savedChoice && !isRemoved &&
        <div className="pd-topic-edit-section">
          <StudentAssignmentEditor course={savedChoice} topicId={topic.id}
            onClose={() => setEditingTopicId(null)}/>
        </div>}
      {planning && linkedTopic && savedChoice && <div className="pd-topic-plan-inline">
        <StudentAssignmentEditor course={savedChoice} topicId={topic.id}
          onAssigned={onTopicAssigned}
          onCancel={() => setPlanningTopicId(null)}
          onClose={() => { setPlanningTopicId(null); onTopicDone?.(); }}/>
      </div>}
    </div>;
  }

  return <div className="pd-topic-review" aria-label={"Topics in " + parent.title}>
    <div className="pd-topic-review-heading">
      <strong>Topics{savedChoice?.stage === "planned" && totalIncluded > 0
        ? " · " + included.length + (mode === "think" ? " to consider" : " in My Plan")
        : ""}
        {removed.length > 0
          ? " · Customized: " + totalIncluded + " of " + children.length + " included"
          : ""}</strong>
      {mode === "plan" && <small>Topics remain individually schedulable and printable</small>}
    </div>
    {included.map(topic => renderTopic(topic))}
    {!included.length && <p className="pd-topic-zero">
      {totalIncluded === 0 ? "No topics included yet." :
        mode === "think" ? "All included topics are in My Plan." :
          "No included topics are assigned yet."}
    </p>}
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
