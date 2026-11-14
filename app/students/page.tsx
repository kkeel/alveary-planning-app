import Link from "next/link";

/**
 * Public-safe placeholder only. Do not let anyone enter private student data
 * until workspace membership, publication-year entitlements and household RLS
 * are implemented and tested.
 */
export default function StudentsPage() {
  return (
    <>
      <h1>Students</h1>
      <p className="lead">Keep track of your students and their school-year grades in one place.</p>
      <div className="notice">
        Student setup is coming to the Planning App. You can explore courses and
        gather ideas now; you won't need to add students before you begin planning.
        When connected accounts are ready, your family students and school
        students will remain in separate, permission-controlled workspaces.
      </div>
      <p><Link href="/courses">Explore courses</Link></p>
    </>
  );
}
