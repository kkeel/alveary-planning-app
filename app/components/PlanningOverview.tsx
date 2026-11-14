import Link from "next/link";

/**
 * The single Planning Overview used for the app's home page and for legacy
 * /planning links. Public browsing remains available during development.
 */
export default function PlanningOverview() {
  return (
    <>

      <h1>Planning Overview</h1>
      <p className="lead">Start with what you already know and build your school-year plan from there.</p>
      <div className="grid">
        <Link className="card" href="/students"><h2>Add students</h2><p>Organize students and their grades when you&apos;re ready.</p></Link>
        <Link className="card" href="/courses"><h2>Choose courses</h2><p>Explore the curriculum and gather your selections.</p></Link>
        <Link className="card" href="/scheduling"><h2>Build a schedule</h2><p>Arrange the work into your family&apos;s routine.</p></Link>
        <Link className="card" href="/books"><h2>Organize books</h2><p>Consider the resources you&apos;ll use.</p></Link>
        <Link className="card" href="/supplies"><h2>Prepare supplies</h2><p>See what you need to gather or purchase.</p></Link>
      </div>
      <div className="notice">These are steps you can take in any order. The Students page is a preview until Memberstack identity, workspace access and private data protections are tested.</div>
    </>
  );
}
