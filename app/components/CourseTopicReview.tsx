"use client";

import { useMemo, useState } from "react";
import { BookOpen, ChevronDown, ChevronRight, Lightbulb, MoreHorizontal, Plus, RotateCcw, SquareCheckBig, UsersRound } from "lucide-react";
import Link from "next/link";
import { useDemoPlan, type SavedCourse } from "./DemoPlanContext";
import { sortTopicsForCourse } from "../courses/topic-order.mjs";
import { isTopicAssigned, topicHasAssignedStudent } from "./topic-assignment.mjs";
import { thinkTankTopicSections, pinTopicWhileEditing } from "./planning-topic-sections.mjs";
import SharedTopicStudentEditor from "./SharedTopicStudentEditor";
import SharedPriorityEditor from "./SharedPriorityEditor";
import { effectivePlanningPriority, priorityRollup } from "./shared-priority.mjs";
import PlacementSymbol from "./PlacementSymbol";
import PlanningScheduleGradeMeta from "./PlanningScheduleGradeMeta";
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
  onTopicAssigned?: (sourceCourseId: string) => void;
  onTopicDone?: (sourceCourseId: string) => void;
  onTopicCancel?: () => void;
  onTopicEditingChange?: (editing: boolean) => void;
};

export default function CourseTopicReview({
  parent, savedChoice, mode, excludedTopicIds = [], onToggleTopic,
  onTopicAssigned, onTopicDone, onTopicCancel, onTopicEditingChange,
}: Props) {
  const demo = useDemoPlan();
  const sharingIndex = useMemo(() => buildTopicSharingIndex(demo.courses, demo.students),
    [demo.courses, demo.students]);
  const [infoTopicId, setInfoTopicId] = useState<string | null>(null);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [planningTopicId, setPlanningTopicId] = useState<string | null>(null);
  const [planningOrigin, setPlanningOrigin] = useState<"selected"|"other"|null>(null);
  function finishPlanningTopic() {
    setPlanningTopicId(null);
    setPlanningOrigin(null);
  }
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
    return persisted ? !persisted.included : excludedTopicIds.includes(topicId);
  }
  const assignedInThisCourse = (topic: CatalogCourse) =>
    Boolean(savedChoice?.stage === "planned" &&
      topicHasAssignedStudent(savedChoice, topic.id, demo.students));
  const baseSections = thinkTankTopicSections(children,savedChoice,demo.students,excludedTopicIds);
  const sections = mode === "think"
    ? pinTopicWhileEditing(children,baseSections,planningTopicId,planningOrigin)
    : baseSections;
  const included = mode === "think" ? sections.selected :
    children.filter(topic => !excluded(topic.id) &&
      (assignedInThisCourse(topic) || editingTopicId === topic.id));
  const other = mode === "think" ? sections.other : [];
  const removed = mode === "plan" ? children.filter(topic => excluded(topic.id)) : [];
  const totalIncluded = children.length - children.filter(topic=>excluded(topic.id)).length;

  // An unchosen topic may still be included in the published curriculum,
  // or it may have been intentionally excluded. Either way it is available
  // for review in Other topics. Reinclude before saving/planning it.
  function addOtherIdea(topic: CatalogCourse) {
    if (!savedChoice || !demo.ready || assignedInThisCourse(topic)) return;
    if (excluded(topic.id)) {
      demo.setTopic(parent.id,topic.id,true);
      const saved = savedChoice.topics.find(t=>t.topicId===topic.id);
      const inherited = saved?.ideaChoice === "on" ||
        (saved?.ideaChoice !== "off" && savedChoice.ideaAll);
      if (!inherited) demo.toggleListIdea(parent.id,topic.id);
    } else demo.toggleListIdea(parent.id,topic.id);
  }
  function addAllOtherIdeas() {
    // Use individual topic intentions, not a whole-course toggle: a partial
    // course may already contain separately chosen/planned topics.
    for(const topic of other) if (!topic.planned) addOtherIdea(topic);
  }

  function renderTopic(topic: CatalogCourse, isRemoved = false, isOther = false) {
    const infoOpen = infoTopicId === topic.id;
    const hasDetails = Boolean(topic.description || topic.tips ||
      topic.schedules.length || topic.gradeDisplay || topic.grades.length);
    const toggleInfo = () => setInfoTopicId(infoOpen ? null : topic.id);
    const detailsId = "pd-topic-details-" + parent.id + "-" + topic.id;
    const editing = editingTopicId === topic.id;
    const linkedTopic = savedChoice?.topics.find(item => item.topicId === topic.id && item.included);
    const planning = planningTopicId === topic.id;
    const menuOpen = topicMenuId === topic.id;
    const assignedNames = mode === "plan" && savedChoice && !isRemoved
      ? demo.students.filter(student =>
          isTopicAssigned(savedChoice, topic.id, student.id)).map(student => student.displayName)
      : [];
    const topicStudents = mode === "plan" && savedChoice && !isRemoved ?
      demo.students.filter(student=>isTopicAssigned(savedChoice,topic.id,student.id)) : [];
    const displayPriority = topicStudents.length ? priorityRollup(topicStudents.map(student=>
      effectivePlanningPriority(demo.sharedPriorities,demo.assignmentPriorities,
        parent.id,topic.id,student.id))) : undefined;
    // The selection marker belongs to the topic title, not the toolbar.
    // Keep both in the same hover/focus surface without tinting the row.
    const selectionMark = mode === "think" && isOther && assignedInThisCourse(topic)
      ? <span className="pd-topic-selection-mark"
          title="Already in My Plan" aria-label="Already in My Plan">
          <SquareCheckBig size={13} aria-hidden="true"/>
        </span>
      : !isRemoved && !isOther
        ? <span className="pd-topic-selection-mark"
            title={mode === "plan" ? "In My Plan" : "In Think Tank"}
            aria-label={mode === "plan" ? "In My Plan" : "In Think Tank"}>
            {mode === "plan"
              ? <SquareCheckBig size={13} aria-hidden="true"/>
              : <Lightbulb size={13} aria-hidden="true"/>}
          </span>
        : null;

    const topicTitle = <span className="pd-topic-title-text">{topic.title}
      {hasDetails && <span className="pd-title-chevron" aria-hidden="true">
        {infoOpen ? <ChevronDown size={12}/> : <ChevronRight size={12}/>}
      </span>}
      {!!assignedNames.length && <small className="pd-topic-assigned-meta">
        {assignedNames.join(" / ")}
      </small>}
    </span>;
    return <div className={"pd-topic-item" + (isRemoved ? " is-excluded" : "")} key={topic.editionId}>
      <div className="pd-topic-row">
        {hasDetails
          ? <button type="button" className="pd-topic-name pd-topic-title-button"
              aria-label={(infoOpen ? "Hide" : "Show") + " details for " + topic.title}
              aria-expanded={infoOpen} aria-controls={detailsId} onClick={toggleInfo}>
              {selectionMark}{topicTitle}
            </button>
          : <span className="pd-topic-name">
              {selectionMark}{topicTitle}
            </span>}
        {savedChoice && !isOther && !isRemoved && linkedTopic &&
          <SharedPriorityEditor courseId={parent.id} topicId={topic.id}
            displayPriority={displayPriority} compact/>}
        <Link className="pd-topic-icon pd-topic-books"
          href={"/books?course=" + encodeURIComponent(topic.id)}
          aria-label={"View books for " + topic.title} title="View books">
          <BookOpen size={15} aria-hidden="true"/>
        </Link>
        {mode === "think" && isOther && !isRemoved && !assignedInThisCourse(topic) &&
          <button type="button" className="pd-topic-icon pd-topic-save-idea"
            title="Add this topic to Think Tank"
            aria-label={"Add " + topic.title + " to Think Tank"}
            disabled={!savedChoice || !demo.ready}
            onClick={() => addOtherIdea(topic)}>
            <Lightbulb size={15} aria-hidden="true"/>
          </button>}
        {mode === "plan" && savedChoice && !isRemoved &&
          <button type="button" className="pd-topic-icon pd-topic-edit"
            aria-label={"Edit students for " + topic.title} title="Edit students"
            aria-expanded={editing}
            onClick={() => {
              setEditingTopicId(editing ? null : topic.id);
              onTopicEditingChange?.(!editing);
            }}>
            <UsersRound size={15} aria-hidden="true"/>
          </button>}
        {mode === "think" && demo.ready && (planning || !assignedInThisCourse(topic)) &&
          <button type="button" className="pd-topic-icon pd-topic-add"
            aria-label={"Add students to " + topic.title + " in " + parent.title}
            title={savedChoice ? "Assign students to this topic" :
              "Save this course to Think Tank before assigning"}
            aria-expanded={planning}
            disabled={!savedChoice}
            onClick={() => {
              if (planning) {finishPlanningTopic();return;}
              if (isRemoved) demo.setTopic(parent.id,topic.id,true);
              setPlanningOrigin(isOther ? "other" : "selected");
              setPlanningTopicId(topic.id);
            }}>
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
        {mode === "think" && !isOther && <button type="button"
          onClick={() => {
            if (savedChoice) demo.toggleListIdea(parent.id,topic.id);
            else onToggleTopic(topic.id,false);
            setTopicMenuId(null);
          }} aria-label={"Remove " + topic.title + " from Think Tank"}
             title="Remove this idea"><Lightbulb size={14} aria-hidden="true"/> Remove idea</button>}
        <button type="button"
          aria-label={(isRemoved ? "Include " : "Exclude ") + topic.title +
            (isRemoved ? " in " : " from ") + parent.title}
          onClick={() => {
          onToggleTopic(topic.id,isRemoved);
          setTopicMenuId(null);
        }}>
          {isRemoved ? <Plus size={14} aria-hidden="true"/> :
            <span aria-hidden="true">−</span>}
          {isRemoved ? "Include topic" : "Exclude topic"}
        </button>
      </div>}
      <TopicOtherUses topicEditionId={topic.editionId}
        parentCourseId={parent.id} index={sharingIndex}/>
      {infoOpen && <div className="pd-topic-info" id={detailsId}>
        <PlanningScheduleGradeMeta course={topic}/>
        {topic.description && <p>{topic.description}</p>}
        {topic.tips && <div className="pd-topic-tips">
          <PlacementSymbol size={17}/><p>{topic.tips}</p>
        </div>}
      </div>}
      {editing && mode === "plan" && savedChoice && !isRemoved &&
        <div className="pd-topic-edit-section">
          <SharedTopicStudentEditor topicEditionId={topic.editionId}
            currentCourseId={parent.id}
            onClose={sourceCourseId => {
              setEditingTopicId(null);
              onTopicEditingChange?.(false);
              onTopicDone?.(sourceCourseId);
            }}
            onCancel={() => {
              setEditingTopicId(null);
              onTopicEditingChange?.(false);
            }}/>
        </div>}
      {planning && linkedTopic && savedChoice && <div className="pd-topic-plan-inline">
        <SharedTopicStudentEditor topicEditionId={topic.editionId}
          currentCourseId={parent.id}
          onAssigned={sourceCourseId => onTopicAssigned?.(sourceCourseId)}
          onCancel={() => { finishPlanningTopic(); onTopicCancel?.(); }}
          onClose={sourceCourseId => {
            finishPlanningTopic(); onTopicDone?.(sourceCourseId);
          }}/>
      </div>}
    </div>;
  }

  return <div className="pd-topic-review" aria-label={"Topics in " + parent.title}>
    <div className="pd-topic-review-heading">
      <strong>Topics</strong>
    </div>
    {included.map(topic => renderTopic(topic))}
    {!included.length && <p className="pd-topic-zero">
      {totalIncluded === 0 ? "No topics included yet." :
        mode === "think" ? "No topics are currently selected for Think Tank." :
          "No included topics are assigned yet."}
    </p>}
    {mode === "think" && !!other.length && <section className="pd-other-topics"
      aria-label={"Other topics in " + parent.title}>
      <div className="pd-other-topics-heading">
        <button type="button" className="pd-other-topics-toggle"
          aria-expanded={removedOpen}
          onClick={() => setRemovedOpen(value => !value)}>
          {removedOpen ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
          Other topics <span>{other.length}</span>
        </button>
        <button type="button" className="pd-other-topics-all"
          title="Add all remaining unplanned topics to Think Tank"
          aria-label={"Add all remaining unplanned topics from " + parent.title + " to Think Tank"}
          disabled={!savedChoice || !demo.ready || !other.some(topic=>!topic.planned)}
          onClick={addAllOtherIdeas}>
          <Lightbulb size={14} aria-hidden="true"/> All
        </button>
      </div>
      {removedOpen && <div className="pd-other-topics-list">
        {other.map(topic=>renderTopic(topic,topic.excluded,true))}
      </div>}
    </section>}
    {mode === "plan" && !!removed.length && <div className="pd-removed">
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
