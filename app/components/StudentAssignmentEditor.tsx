"use client";

import { useState } from "react";
import Link from "next/link";
import { BookOpen, ChevronDown, ChevronRight, UsersRound } from "lucide-react";
import { useDemoPlan, type SavedCourse, type PlanningGroup, type StudentPreference } from "./DemoPlanContext";
import catalog from "../courses/catalog-preview.json";

const details = new Map(catalog.courses.map(c => [c.id, c]));
type Props = {
  course: SavedCourse;
  showCourseInfo?: boolean;
  onAssigned?: () => void;
};
const arrangements: StudentPreference["arrangement"][] = ["Combined", "Separate", "Both", "Later"];
const priorities: Array<NonNullable<StudentPreference["priority"]>> =
  ["Core", "High Interest", "Additional"];

export default function StudentAssignmentEditor({ course, showCourseInfo = false, onAssigned }: Props) {
  const demo = useDemoPlan();
  const catalogCourse = details.get(course.courseId);
  const [showTopics, setShowTopics] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [groupEditing, setGroupEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupStudentIds, setGroupStudentIds] = useState<string[]>([]);
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const included = course.topics.filter(t => t.included);
  const grouped = catalogCourse?.type === "Combined Course";
  const assigned = new Set(course.studentIds);

  function assignedToTopic(topicId: string, studentId: string): boolean {
    const override = course.overrides.find(o => o.topicId === topicId && o.studentId === studentId);
    return override ? override.assigned : assigned.has(studentId);
  }
  function assign(ids: string[]) {
    if (!ids.length) return;
    demo.assignStudents(course.courseId, ids, true);
    onAssigned?.();
  }
  function openGroup(group?: PlanningGroup) {
    setGroupEditing(true);
    setEditingGroupId(group?.id ?? null);
    setGroupName(group?.name ?? "");
    setGroupStudentIds(group?.studentIds ?? []);
  }
  async function saveGroup() {
    if (!groupName.trim()) return;
    await demo.saveGroup(groupName.trim(), groupStudentIds, editingGroupId ?? undefined);
    setGroupEditing(false);
  }

  return <div className="plan-editor">
    {showCourseInfo && <>
      {catalogCourse?.description && <p className="pd-review-description">{catalogCourse.description}</p>}
      {catalogCourse?.tips && <div className="plan-guidance">
        <strong>Placement &amp; combining guidance</strong>
        <p>{catalogCourse.tips}</p>
      </div>}
    </>}
    <div className="plan-assign-head">
      <strong><UsersRound size={14} aria-hidden="true" /> Plan for</strong>
      <Link href="/students">Manage students</Link>
    </div>
    <div className="plan-group-shortcuts" aria-label="Quick-select groups">
      <button type="button" onClick={() => assign(demo.students.map(s => s.id))}
        disabled={!demo.students.length}
        title="Assign all current students, without creating duplicate course records">
        Family <small>{demo.students.length}</small>
      </button>
      {demo.studentGroups.map(group => <div className="plan-group-pill" key={group.id}>
        <button type="button" onClick={() => assign(group.studentIds)}
          disabled={!group.studentIds.length}
          title={"Assign everyone currently in " + group.name}>
          {group.name} <small>{group.studentIds.length}</small>
        </button>
        <button type="button" className="plan-group-edit" onClick={() => openGroup(group)}
          aria-label={"Edit " + group.name}>Edit</button>
      </div>)}
      <button type="button" className="plan-group-create" onClick={() => openGroup()}>
        + Group
      </button>
    </div>

    {groupEditing && <div className="plan-group-form">
      <label htmlFor="planning-group-name">Group name</label>
      <input id="planning-group-name" value={groupName} maxLength={50}
        onChange={e => setGroupName(e.target.value)} placeholder="e.g. Younger Students"/>
      <div className="plan-individuals">
        {demo.students.map(student => <label key={student.id}>
          <input type="checkbox" checked={groupStudentIds.includes(student.id)}
            onChange={e => setGroupStudentIds(prev =>
              e.target.checked ? [...prev, student.id] : prev.filter(id => id !== student.id))}/>
          {student.displayName}
        </label>)}
      </div>
      <div className="plan-group-form-actions">
        <button type="button" onClick={() => void saveGroup()} disabled={!groupName.trim() || demo.saving}>
          Save group
        </button>
        <button type="button" onClick={() => setGroupEditing(false)}>Cancel</button>
        {editingGroupId && <button type="button" className="plan-group-delete"
          onClick={() => {
            if (window.confirm("Delete this group shortcut? Existing course assignments will remain unchanged.")) {
              void demo.deleteGroup(editingGroupId);
              setGroupEditing(false);
            }
          }}>Delete group</button>}
      </div>
      <p className="plan-microcopy">Groups are shortcuts. Changing one never changes assignments you already made.</p>
    </div>}

    {demo.students.length ? <div className="plan-individuals" aria-label="Individual student assignments">
      {demo.students.map(student => <label key={student.id}>
        <input type="checkbox" checked={assigned.has(student.id)} onChange={e => {
            demo.assignStudents(course.courseId, [student.id], e.target.checked);
            if (e.target.checked) onAssigned?.();
          }}/>
        {student.displayName}
      </label>)}
    </div> : <p className="plan-microcopy">
      No students added yet. <Link href="/students">Add a student</Link> to begin.
    </p>}
    <p className="plan-microcopy">
      {grouped
        ? "Assigning this course includes all of its selected topics. You can adjust individual topics below."
        : "You can change student assignments whenever you like."}
    </p>

    {course.studentIds.length > 0 && <>
      <button type="button" className="plan-text-disclosure"
        aria-expanded={showPreferences}
        onClick={() => setShowPreferences(v => !v)}>
        {showPreferences ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        Priorities &amp; arrangements <small>optional</small>
      </button>
      {showPreferences && <div className="plan-preferences">
        {demo.students.filter(st => assigned.has(st.id)).map(student => {
          const pref = demo.studentPreferences.find(p =>
            p.courseId === course.courseId && p.studentId === student.id);
          const priority = pref?.priority ?? null;
          const arrangement = pref?.arrangement ?? "Later";
          return <div className="plan-preference-row" key={student.id}>
            <strong>{student.displayName}</strong>
            <label>Priority
              <select value={priority ?? ""}
                onChange={e => demo.setPreference(course.courseId, student.id,
                  (e.target.value || null) as StudentPreference["priority"], arrangement)}>
                <option value="">Not set</option>
                {priorities.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Arrangement
              <select value={arrangement}
                onChange={e => demo.setPreference(course.courseId, student.id, priority,
                  e.target.value as StudentPreference["arrangement"])}>
                {arrangements.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>;
        })}
        <p className="plan-microcopy">You can leave the priority blank and decide the arrangement later.</p>
      </div>}
    </>}

    {course.topics.length > 0 && <div className="plan-topics-disclosure">
      <button type="button" className="plan-text-disclosure"
        aria-expanded={showTopics} onClick={() => setShowTopics(v => !v)}>
        {showTopics ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        {course.topics.length === 1 ? "Adjust topic" : "Adjust individual topics"}
        <small>{included.length} of {course.topics.length} included</small>
      </button>
      {showTopics && <div className="plan-topic-rows">
        {course.topics.map(topic => {
          const topicCatalog = details.get(topic.topicId);
          const open = editingTopic === topic.topicId;
          return <div className="plan-topic-row" key={topic.topicEditionId}>
            <div className="plan-topic-heading">
              <button type="button" onClick={() => setEditingTopic(open ? null : topic.topicId)}
                aria-expanded={open}>
                {open ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
                {topicCatalog?.title ?? "Topic"}
              </button>
              <label><input type="checkbox" checked={topic.included}
                onChange={e => demo.setTopic(course.courseId, topic.topicId, e.target.checked)}/>
                Include</label>
            </div>
            {open && <div className="plan-topic-details">
              {topicCatalog?.description && <p>{topicCatalog.description}</p>}
              {topicCatalog?.tips && <p>{topicCatalog.tips}</p>}
              {topic.included && <div className="plan-individuals">
                {demo.students.map(student => <label key={student.id}>
                  <input type="checkbox" checked={assignedToTopic(topic.topicId, student.id)}
                    onChange={e => demo.assignTopic(course.courseId, topic.topicId,
                      student.id, e.target.checked)}/>
                  {student.displayName}
                </label>)}
              </div>}
            </div>}
          </div>;
        })}
      </div>}
    </div>}

    <Link className="plan-book-link" href="/books">
      <BookOpen size={14} aria-hidden="true" /> View books
    </Link>
  </div>;
}
