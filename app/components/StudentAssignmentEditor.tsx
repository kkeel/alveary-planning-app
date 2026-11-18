"use client";

import { useId, useState, type FormEvent } from "react";
import { Settings2, UsersRound, X } from "lucide-react";
import { useDemoPlan, type SavedCourse, type PlanningGroup } from "./DemoPlanContext";
import { effectiveTopicCount, isTopicAssigned, shouldPromoteChoiceOnDone } from "./topic-assignment.mjs";
import { courseArrangement, topicArrangementOverride } from "./arrangement-inheritance.mjs";
import SharedPriorityEditor from "./SharedPriorityEditor";
import StudentPriorityControl from "./StudentPriorityControl";

const arrangements = ["Combined", "Separate", "Later"] as const;

export default function StudentAssignmentEditor({
  course, topicId, onAssigned, onClose, onCancel,
}: { course: SavedCourse; topicId?: string; onAssigned?: () => void;
  onClose?: () => void; onCancel?: () => void }) {
  const demo = useDemoPlan();
  const fieldId = useId();
  // One editor and one student UI for both scopes. The clicked parent is always
  // the source of truth; a topic checkbox never creates a standalone choice.
  const topicChoice = topicId ? course.topics.find(topic =>
    topic.topicId === topicId && topic.included) : null;
  const [detailsStudentId, setDetailsStudentId] = useState<string | null>(null);
  const [groupEditing, setGroupEditing] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupStudentIds, setGroupStudentIds] = useState<string[]>([]);
  const [addingStudent, setAddingStudent] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentSaving, setStudentSaving] = useState(false);
  const [studentError, setStudentError] = useState<string | null>(null);
  // Selections save immediately. An untouched editor can be canceled; once
  // edits have been sent to the save queue, call the exit action "Close" so
  // it cannot be mistaken for undoing already-saved assignments.
  const [hasSavedEdits, setHasSavedEdits] = useState(false);
  const assigned = new Set(topicId
    ? demo.students.filter(student => isTopicAssigned(course, topicId, student.id))
      .map(student => student.id)
    : course.studentIds);
  const topicOnlyStudents = topicId ? [] : demo.students.filter(student =>
    !assigned.has(student.id) && effectiveTopicCount(course, student.id) > 0);

  function setStudentAssignments(ids: string[], checked: boolean) {
    if (!ids.length || (topicId && !topicChoice)) return;
    setHasSavedEdits(true);
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
    if (!demo.error) {
      setGroupEditing(false);
      setHasSavedEdits(true);
    }
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
      setHasSavedEdits(true);
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
      <div className="plan-assign-head-tools">
        <div className="pd-assignment-quick-actions">
          {(onCancel || onClose) && <button type="button" className="pd-cancel-action"
            onClick={() => (onCancel ?? onClose)?.()}
            title={hasSavedEdits
              ? "Close editing; earlier changes are already saved"
              : "Cancel editing without changing this assignment"}>
            {hasSavedEdits ? "Close" : "Cancel"}
          </button>}
          {onClose && <button type="button" className="pd-done-action"
            onClick={finishEditing} title="Finish student editing and save this selection to My Plan">
            Done
          </button>}
        </div>
        <div className="plan-assign-secondary-tools">
          <SharedPriorityEditor courseId={course.courseId} topicId={topicId ?? null}
            selectedTopicIds={topicId ? [] : course.topics.filter(t=>t.included).map(t=>t.topicId)}/>
          <button type="button" className="pd-inline-edit" aria-expanded={addingStudent}
            onClick={() => { setAddingStudent(v => !v); setStudentError(null); }}>
            {addingStudent ? "Cancel adding" : "+ Add student"}
          </button>
        </div>
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

    <div className={"plan-assign-layout" + (detailsStudentId ? " has-details" : "")}>
      <div className="plan-assign-main">
        {!!demo.students.length && <div className="plan-group-shortcuts" aria-label="Choose students">
          <button type="button" className="plan-select-all"
            onClick={() => assign(demo.students.map(student => student.id))}
            title={topicId ? "Assign this topic to every student" :
              "Assign the included course to every student"}>
            All
          </button>
          {demo.studentGroups.map(group => <div className="plan-group-pill" key={group.id}>
            <button type="button" onClick={() => assign(group.studentIds)}
              disabled={!group.studentIds.length}>{group.name}</button>
            <button type="button" className="plan-group-edit" onClick={() => openGroup(group)}
              aria-label={"Edit " + group.name}>Edit</button>
          </div>)}
          <button type="button" className="plan-group-create" onClick={() => openGroup()}>
            + Group
          </button>
        </div>}
        <div className="plan-student-list" aria-label="Assign individual students">
          {demo.students.map(student => {
            const isAssigned=assigned.has(student.id);
            const hasTopicChoices=!topicId && effectiveTopicCount(course,student.id)>0;
            return <div className={"plan-student-row" +
              (isAssigned?" is-assigned":"") + (detailsStudentId===student.id?" is-editing":"")}
              key={student.id}>
              <label className="plan-student-check">
                <input type="checkbox" checked={isAssigned}
                  onChange={event=>setStudentAssignments([student.id],event.target.checked)}/>
                <span>{student.displayName}</span>
              </label>
              <div className="plan-student-tools">
                <StudentPriorityControl courseId={course.courseId} topicId={topicId??null}
                  studentId={student.id} studentName={student.displayName}
                  disabled={!isAssigned} onChanged={()=>setHasSavedEdits(true)}/>
                <button type="button" className="plan-student-settings"
                  title={"Other choices for "+student.displayName}
                  aria-label={"Other choices for "+student.displayName}
                  aria-expanded={detailsStudentId===student.id}
                  disabled={!isAssigned&&!hasTopicChoices}
                  onClick={()=>setDetailsStudentId(id=>id===student.id?null:student.id)}>
                  <Settings2 size={15} aria-hidden="true"/>
                </button>
              </div>
            </div>;
          })}
        </div>
        {!!topicOnlyStudents.length && <p className="plan-microcopy">
          {topicOnlyStudents.map(student=>student.displayName).join(", ")}
          {" "}{topicOnlyStudents.length===1?"has":"have"} individual topics selected.
          Selecting a name above assigns the included course.
        </p>}
        {groupEditing && <div className="plan-group-form">
          <label htmlFor={fieldId+"-group-name"}>Group name</label>
          <input id={fieldId+"-group-name"} value={groupName} maxLength={50}
            onChange={event=>setGroupName(event.target.value)}
            placeholder="e.g. Younger Students"/>
          <div className="plan-individuals">
            {demo.students.map(student=><label key={student.id}>
              <input type="checkbox" checked={groupStudentIds.includes(student.id)}
                onChange={event=>setGroupStudentIds(prev=>
                  event.target.checked ? [...prev,student.id] :
                    prev.filter(id=>id!==student.id))}/>
              {student.displayName}
            </label>)}
          </div>
          <div className="plan-group-form-actions">
            <button type="button" onClick={()=>void saveGroup()}
              disabled={!groupName.trim()||demo.saving}>Save group</button>
            <button type="button" onClick={()=>setGroupEditing(false)}>Cancel</button>
            {editingGroupId && <button type="button" className="plan-group-delete"
              onClick={()=>{
                if(window.confirm("Delete this group shortcut? Existing course assignments remain unchanged.")){
                  void demo.deleteGroup(editingGroupId);
                  setHasSavedEdits(true);
                  setGroupEditing(false);
                }
              }}>Delete group</button>}
          </div>
          <p className="plan-microcopy">
            Groups are shortcuts. Changing a group doesn't change saved assignments.
          </p>
        </div>}
      </div>
      {detailsStudentId && (()=>{
        const student=demo.students.find(s=>s.id===detailsStudentId);
        if(!student || (!assigned.has(student.id) &&
          (topicId || effectiveTopicCount(course,student.id)===0))) return null;
        const arrangement=courseArrangement(demo.assignmentArrangements,course.courseId,student.id);
        const topicArrangement=topicId ? topicArrangementOverride(
          demo.assignmentArrangements,course.courseId,student.id,topicId) : "inherit";
        return <section className="plan-student-detail" aria-label={"Other choices for "+student.displayName}>
          <div className="plan-student-detail-head">
            <strong>{student.displayName} · Other choices</strong>
            <button type="button" aria-label="Close other choices"
              onClick={()=>setDetailsStudentId(null)}><X size={15}/></button>
          </div>
          {topicId && <div className="plan-student-detail-priority">
            <span>Whole course</span>
            <StudentPriorityControl courseId={course.courseId}
              studentId={student.id} studentName={student.displayName}
              onChanged={()=>setHasSavedEdits(true)}/>
          </div>}
          <label>Arrangement
            <select value={arrangement} onChange={event=>{
              setHasSavedEdits(true);
              demo.setAssignmentArrangement(course.courseId,student.id,null,
                event.target.value as "Combined"|"Separate"|"Later");
            }}>
              {arrangements.map(item=><option key={item} value={item}>
                {item==="Later"?"Decide later":item}
              </option>)}
              {arrangement==="Both" && <option value="Both">Both (previous setting)</option>}
            </select>
          </label>
          {topicId && <label>This topic
            <select value={topicArrangement} onChange={event=>{
              setHasSavedEdits(true);
              demo.setAssignmentArrangement(course.courseId,student.id,topicId,
                event.target.value==="inherit" ? null :
                event.target.value as "Combined"|"Separate"|"Later");
            }}>
              <option value="inherit">Same as course</option>
              {arrangements.map(item=><option key={item} value={item}>
                {item==="Later"?"Decide later":item}
              </option>)}
              {topicArrangement==="Both" && <option value="Both">Both (previous setting)</option>}
            </select>
          </label>}
          <small>Changes for {student.displayName} won't affect anyone else's settings.</small>
        </section>;
      })()}
    </div>
  </div>;
}
