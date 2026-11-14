"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { usePlannerAuth } from "./PlannerAuthProvider";
import { useDemoPlan } from "./DemoPlanContext";

type Student = { id: string; displayName: string; gradeLevel: number | null };
type StudentsResult = { schoolYear: string; planKind: "demo"; students: Student[] };
type Action = "list" | "add" | "update" | "archive";
const year = "2027-28";
const projectUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const grades = Array.from({ length: 13 }, (_, n) => n);
// Ephemeral per-auth-user data, not localStorage or a persistent public cache.
// Keep the last server-confirmed list across route unmount/remount in one tab.
const studentCache = new Map<string, Student[]>();

function labelForGrade(grade: number | null): string {
  if (grade === null) return "Grade to be decided";
  return grade === 0 ? "Kindergarten" : "Grade " + grade;
}
function isStudent(value: unknown): value is Student {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  return typeof x.id === "string" && typeof x.displayName === "string" &&
    (x.gradeLevel === null || (typeof x.gradeLevel === "number" &&
      Number.isInteger(x.gradeLevel) && x.gradeLevel >= 0 && x.gradeLevel <= 12));
}
function isStudentsResult(value: unknown): value is StudentsResult {
  if (!value || typeof value !== "object") return false;
  const x = value as Record<string, unknown>;
  return x.schoolYear === year && x.planKind === "demo" &&
    Array.isArray(x.students) && x.students.every(isStudent);
}

export default function StudentsManager() {
  const { status, userId, getAccessToken } = usePlannerAuth();
  const demoPlan = useDemoPlan();
  const [students, setStudents] = useState<Student[]>(() =>
    userId ? studentCache.get(userId) ?? [] : []);
  const [loading, setLoading] = useState(() =>
    !userId || !studentCache.has(userId));
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const editRevision = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const request = useCallback(async (action: Action, fields: object = {}): Promise<StudentsResult> => {
    if (!projectUrl || !publicKey) throw new Error("not_configured");
    const token = await getAccessToken();
    if (!token) throw new Error("sign_in_required");
    const response = await fetch(projectUrl + "/functions/v1/demo-students", {
      method: "POST",
      cache: "no-store",
      credentials: "omit",
      headers: {
        "Authorization": "Bearer " + token,
        "apikey": publicKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ action, ...fields }),
    });
    if (!response.ok) throw new Error(response.status === 403
      ? "demo_access_required" : "request_failed");
    const data: unknown = await response.json();
    if (!isStudentsResult(data)) throw new Error("invalid_response");
    return data;
  }, [getAccessToken]);

  useEffect(() => {
    if (status !== "signed-in" || !userId) return;
    let active = true;
    const revision = editRevision.current;
    const cached = studentCache.get(userId);
    if (cached) {
      setStudents(cached);
      setLoading(false);
      setRefreshing(true);
    } else {
      setLoading(true);
      setRefreshing(false);
    }
    setError(null);
    // Revalidate after navigation without blanking a previously loaded list.
    void request("list").then(data => {
      if (!active) return;
      if (editRevision.current === revision) {
        studentCache.set(userId, data.students);
        setStudents(data.students);
      }
      setLoading(false);
      setRefreshing(false);
    }).catch(() => {
      if (!active) return;
      setLoading(false);
      setRefreshing(false);
      setError(cached
        ? "We couldn't update your students just now. Showing the last saved list."
        : "We couldn't open your Demo family workspace. Please try refreshing this page.");
    });
    return () => { active = false; };
  }, [request, status, userId]);

  function reset() {
    setName("");
    setGrade("");
    setEditingId(null);
  }
  function edit(student: Student) {
    setEditingId(student.id);
    setName(student.displayName);
    setGrade(student.gradeLevel === null ? "" : String(student.gradeLevel));
    setError(null);
    setSuccess(null);
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || loading) return;
    const displayName = name.trim();
    if (!displayName || displayName.length > 60) {
      setError("Enter a name or nickname, up to 60 characters.");
      return;
    }
    const gradeLevel = grade === "" ? null : Number(grade);
    if (gradeLevel !== null && (!Number.isInteger(gradeLevel) || gradeLevel < 0 || gradeLevel > 12)) {
      setError("Choose a grade from Kindergarten through Grade 12, or decide later.");
      return;
    }
    editRevision.current += 1;
    const wasEditing = Boolean(editingId);
    const currentStudentId = editingId;
    const pendingId = "pending:" + Date.now();
    const before = wasEditing ? students.find(student => student.id === currentStudentId) : undefined;
    // The change appears immediately, but is labelled as saving until the
    // server confirms. Never put provisional data into the shared cache.
    setStudents(current => wasEditing
      ? current.map(student => student.id === currentStudentId
        ? { ...student, displayName, gradeLevel } : student)
      : [...current, { id: pendingId, displayName, gradeLevel }]);
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const updated = await request(wasEditing ? "update" : "add", {
        ...(currentStudentId ? { studentId: currentStudentId } : {}),
        displayName, gradeLevel,
      });
      if (userId) studentCache.set(userId, updated.students);
      setStudents(updated.students);
      void demoPlan.refresh();
      setSuccess(wasEditing ? "Student details saved to your Demo workspace." :
        "Student added to your Demo workspace.");
      reset();
    } catch {
      setStudents(current => wasEditing && before
        ? current.map(student => student.id === before.id ? before : student)
        : current.filter(student => student.id !== pendingId));
      setError("We couldn't save that student. Your previous saved information is unchanged.");
    } finally { setSaving(false); }
  }
  async function archive(student: Student) {
    if (saving || !window.confirm("Archive " + student.displayName +
      " from your active student list? Their record will be kept for historical planning.")) return;
    editRevision.current += 1;
    setStudents(current => current.filter(item => item.id !== student.id));
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await request("archive", { studentId: student.id });
      if (userId) studentCache.set(userId, data.students);
      setStudents(data.students);
      void demoPlan.refresh();
      setSuccess("Student archived. Their information is retained for your records.");
      if (editingId === student.id) reset();
    } catch {
      setStudents(current => [...current, student]);
      setError("We couldn't archive that student. Please try again.");
    } finally { setSaving(false); }
  }

  return <section className="demo-students" aria-label="Demo family students">
    <div className="demo-students-intro">
      <h1>Students</h1>
      <p className="lead">Add students when you&apos;re ready. A first name or nickname is enough, and you can choose their grades later.</p>
      <p className="demo-students-meta">Demo family workspace · School year {year}</p>
    </div>

    <div className="demo-students-layout">
      <section className="demo-students-panel" aria-label="Your students">
        <div className="demo-students-heading">
          <h2>My students</h2>
          <span>{loading ? "Opening…" : students.length + (students.length === 1 ? " student" : " students")}
            {refreshing ? " · Updating" : ""}
          </span>
        </div>
        {loading ? <p role="status" className="demo-students-muted">Opening your private Demo workspace…</p> :
          students.length === 0 ? <p className="demo-students-empty">No students added yet. Start with one, or return whenever you&apos;re ready.</p> :
          <ul className="demo-students-list">
            {students.map(student => <li className="demo-student-row" key={student.id}>
              <div className="demo-student-details">
                <strong>{student.displayName}</strong>
                <span>{student.id.startsWith("pending:") ? "Saving…" : labelForGrade(student.gradeLevel)}</span>
              </div>
              <div className="demo-student-actions">
                <button type="button" onClick={() => edit(student)} disabled={saving || student.id.startsWith("pending:")} aria-label={"Edit " + student.displayName}>Edit</button>
                <button type="button" onClick={() => void archive(student)} disabled={saving || student.id.startsWith("pending:")} aria-label={"Archive " + student.displayName}>Archive</button>
              </div>
            </li>)}
          </ul>}
      </section>

      <section className="demo-students-panel" aria-label={editingId ? "Edit student" : "Add a student"}>
        <h2>{editingId ? "Edit student" : "Add a student"}</h2>
        <p className="demo-students-muted">Grades belong to this school year; student names stay with your family workspace.</p>
        <form onSubmit={event => void submit(event)} className="demo-students-form">
          <label htmlFor="demo-student-name">Name or nickname</label>
          <input
            id="demo-student-name" type="text" autoComplete="off" maxLength={60}
            required value={name} disabled={saving || loading}
            placeholder="Student's name" onChange={event => setName(event.target.value)}
          />
          <label htmlFor="demo-student-grade">Grade for {year}</label>
          <select id="demo-student-grade" value={grade} disabled={saving || loading}
            onChange={event => setGrade(event.target.value)}>
            <option value="">Choose later</option>
            {grades.map(n => <option key={n} value={String(n)}>{labelForGrade(n)}</option>)}
          </select>
          <div className="demo-students-form-actions">
            <button type="submit" className="demo-students-primary" disabled={saving || loading}>
              {saving ? "Saving…" : editingId ? "Save student" : "Add student"}
            </button>
            {editingId && <button type="button" className="demo-students-cancel" disabled={saving} onClick={reset}>Cancel</button>}
          </div>
        </form>
        {error && <p className="demo-students-error" role="alert">{error}</p>}
        {success && <p className="demo-students-success" role="status">{success}</p>}
      </section>
    </div>

    <div className="notice demo-students-next">
      Your students are saved privately in Supabase. Your course ideas are still saved in
      this browser; linking those choices to students and making them persistent across
      devices is the next step. <Link href="/courses">Return to your course Think Tank</Link>.
    </div>
  </section>;
}
