"use client";

import { useId, useState, type FormEvent } from "react";
import { ChevronDown, ChevronRight, UsersRound } from "lucide-react";
import { useDemoPlan, type SavedCourse, type PlanningGroup, type StudentPreference } from "./DemoPlanContext";
import { effectiveTopicCount, isTopicAssigned, shouldPromoteChoiceOnDone } from "./topic-assignment.mjs";

const arrangements: StudentPreference["arrangement"][] = ["Combined", "Separate", "Later"];
const priorities: Array<NonNullable<StudentPreference["priority"]>> =
  ["Core", "High Interest", "Additional"];

export default function StudentAssignmentEditor({
  course, topicId, onAssigned, onClose,
}: { course: SavedCourse; topicId?: string; onAssigned?: () => void; onClose?: () => void }) {
  const demo = useDemoPlan();
  const fieldId = useId();
  // One editor and one student UI for both scopes. The clicked parent is always
  // the source of truth; a topic checkbox never creates a standalone choice.
  const topicChoice = topicId ? course.topics.find(topic =>
    topic.topicId === topicId && topic.included) : null;
  const [showPreferences, setShowPreferences] = useState(false);
  const [groupEditing, setGroupEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupStudentIds, setGroupStudentIds] = useState<string[]>([]);
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  const assigned = new Set(topicId
    ? demo.students.filter(student => isTopicAssigned(course, topicId, student.id))
      .map(student => student.id)
    : course.studentIds);
  const topicOnlyStudents = topicId ? [] : demo.students.filter(student =>
    !assigned.has(student.id) && effectiveTopicCount(course, student.id) > 0);

  function setStudentAssignments(ids: string[], checked: boolean) {
    if (!ids.length || (topicId && !topicChoice)) return;
    if (topicId) for (const studentId of ids) {
      demo.assignTopic(course.courseId, topicId, studentId, checked);
    }
    else demo.assignStudents(course.courseId, ids, checked);
    if (checked) onAssigned?.();
  }
  function assign(ids: string[]) {
    setStudentAssignments(ids, true);
  }
  function finishEditing() {
    // The existing editor autosaves checkbox changes. But an idea can contain
    // previously checked students after Return to Think Tank. Those checkboxes
    // don't fire an onChange when simply viewed, so Done must finalize its
    // status, too, rather than only closing the editor.
    if (shouldPromoteChoiceOnDone(course, topicId, demo.students)) {
      demo.setStage(course.courseId, "planned");
      onAssigned?.();
    }
    onClose?.();
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
    if (!demo.error) setGroupEditing(false);
  }
  async function submitStudent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (studentSaving || !studentName.trim()) return;
    setStudentSaving(true);
    setStudentError(null);
    const gradeLevel = studentGrade === "" ? null : Number(studentGrade);
    const ok = await demo.addStudent(studentName, gradeLevel);
    setStudentSaving(false);
    if (ok) {
      setStudentName("");
      setStudentGrade("");
      setAddingStudent(false);
    } else setStudentError("We couldn't add that student. Your other assignments are unchanged.");
  }

  if (topicId && !topicChoice) return <p className="plan-microcopy" role="status">
    This topic isn't included in the saved course. Restore it before assigning students.
  </p>;

  return <div className="plan-editor">
    <div className="plan-assign-head">
      <strong><UsersRound size={14} aria-hidden="true"/> Students</strong>
      <div className="pd-assignment-quick-actions">
        <button type="button" className="pd-inline-edit" aria-expanded={addingStudent}
          onClick={() => { setAddingStudent(v => !v); setStudentError(null); }}>
          {addingStudent ? "Cancel adding" : "+ Add student"}
        </button>
        {onClose && <button type="button" className="pd-done-action"
          onClick={finishEditing} title="Finish student editing and save this selection to My Plan">Done</button>}
      </div>
    </div>
    {addingStudent && <form className="pd-student-inline-form" onSubmit={event => void submitStudent(event)}>
      <label htmlFor={fieldId+"-student"}>Name or nickname</label>
      <input id={fieldId+"-student"} value={studentName} maxLength={60} required
        placeholder="Student's name" onChange={event => setStudentName(event.target.value)}/>
      <label htmlFor={fieldId+"-grade"}>Grade for 2027–28</label>
      <select id={fieldId+"-grade"} value={studentGrade}
        onChange={event => setStudentGrade(event.target.value)}>
        <option value="">Decide later</option>
        <option value="0">Kindergarten</option>
        {Array.from({length:12},(_,index) => index+1).map(grade =>
          <option key={grade} value={grade}>Grade {grade}</option>)}
      </select>
      <button type="submit" disabled={studentSaving || !studentName.trim()}>
        {studentSaving ? "Adding…" : "Save student"}
      </button>
      {studentError && <span role="alert" className="pd-inline-student-error">{studentError}</span>}
    </form>}

    <div className="plan-individuals" aria-label="Assign individual students">
      {demo.students.map(student => <label key={student.id}>
        <input type="checkbox" checked={assigned.has(student.id)}
          onChange={event => {
            setStudentAssignments([student.id], event.target.checked);
          }}/>
        {student.displayName}
      </label>)}
    </div>
    {!!topicOnlyStudents.length && <p className="plan-microcopy">
      {topicOnlyStudents.map(student => student.displayName).join(", ")}
      {" "}{topicOnlyStudents.length === 1 ? "has" : "have"} individual topics selected.
      Selecting a name above assigns the full included course.
    </p>}
    {!!demo.students.length && <div className="plan-group-shortcuts" aria-label="Choose a student group">
      <button type="button" onClick={() => assign(demo.students.map(student => student.id))}
        title={topicId ? "Assign this topic to every student" :
          "Assign the full included course to every current student"}>
        Family <small>{demo.students.length}</small>
      </button>
      {demo.studentGroups.map(group => <div className="plan-group-pill" key={group.id}>
        <button type="button" onClick={() => assign(group.studentIds)}
          disabled={!group.studentIds.length}>
          {group.name} <small>{group.studentIds.length}</small>
        </button>
        <button type="button" className="plan-group-edit" onClick={() => openGroup(group)}
          aria-label={"Edit " + group.name}>Edit</button>
      </div>)}
      <button type="button" className="plan-group-create" onClick={() => openGroup()}>
        + Group
      </button>
    </div>}
    {groupEditing && <div className="plan-group-form">
      <label htmlFor="planning-group-name">Group name</label>
      <input id="planning-group-name" value={groupName} maxLength={50}
        onChange={event => setGroupName(event.target.value)} placeholder="e.g. Younger Students"/>
      <div className="plan-individuals">
        {demo.students.map(student => <label key={student.id}>
          <input type="checkbox" checked={groupStudentIds.includes(student.id)}
            onChange={event => setGroupStudentIds(prev =>
              event.target.checked ? [...prev,student.id] : prev.filter(id => id !== student.id))}/>
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
            if (window.confirm("Delete this group shortcut? Existing course assignments remain unchanged.")) {
              void demo.deleteGroup(editingGroupId);
              setGroupEditing(false);
            }
          }}>Delete group</button>}
      </div>
      <p className="plan-microcopy">Groups are shortcuts. Changes to a group never rewrite saved assignments.</p>
    </div>}
    {!topicId && !!course.studentIds.length && <>
      <button type="button" className="plan-text-disclosure"
        aria-expanded={showPreferences} onClick={() => setShowPreferences(v => !v)}>
        {showPreferences ? <ChevronDown size={13}/> : <ChevronRight size={13}/>}
        Priorities &amp; arrangements <small>optional</small>
      </button>
      {showPreferences && <div className="plan-preferences">
        {demo.students.filter(student => assigned.has(student.id)).map(student => {
          const pref = demo.studentPreferences.find(p =>
            p.courseId === course.courseId && p.studentId === student.id);
          const priority = pref?.priority ?? null;
          const arrangement = pref?.arrangement ?? "Later";
          return <div className="plan-preference-row" key={student.id}>
            <strong>{student.displayName}</strong>
            <label>Priority
              <select value={priority ?? ""}
                onChange={event => demo.setPreference(course.courseId, student.id,
                  (event.target.value || null) as StudentPreference["priority"], arrangement)}>
                <option value="">Not set</option>
                {priorities.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label>Arrangement
              <select value={arrangement}
                onChange={event => demo.setPreference(course.courseId, student.id, priority,
                  event.target.value as StudentPreference["arrangement"])}>
                {arrangements.map(item => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>;
        })}
      </div>}
    </>}
  </div>;
}
