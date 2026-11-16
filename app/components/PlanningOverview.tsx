"use client";

import Link from "next/link";
import { usePlannerAuth } from "./PlannerAuthProvider";

/** Public browsing is open; member planning entry points use an auth-aware preview. */
export default function PlanningOverview() {
  const { status, authenticated, planAccess } = usePlannerAuth();
  const signedIn = status === "signed-in";

  return <>
    <h1>Planning Overview</h1>
    <p className="lead">Start with what you already know and build your school-year plan from there.</p>
    <div className="grid">
      {signedIn && <Link className="card" href="/students">
        <h2>Add students</h2><p>Organize students and their grades when you&apos;re ready.</p>
      </Link>}
      <Link className="card" href="/courses">
        <h2>Choose courses</h2><p>Explore the curriculum and gather your selections.</p>
      </Link>
      {signedIn && <Link className="card" href="/scheduling">
        <h2>Build a schedule</h2><p>Arrange the work into your family&apos;s routine.</p>
      </Link>}
      <Link className="card" href="/books">
        <h2>Organize books</h2><p>Consider the resources you&apos;ll use.</p>
      </Link>
      <Link className="card" href="/supplies">
        <h2>Prepare supplies</h2><p>See what you need to gather or purchase.</p>
      </Link>
    </div>
    <div className="notice">
      {status === "checking" ? "Checking your Alveary sign-in…" :
        signedIn
          ? "This is a planning preview. Student records and member-specific permissions are not yet enabled."
          : authenticated && planAccess === "unavailable"
            ? "Signed in, but we couldn't verify an active Demo plan. Public lists are available while access is being configured."
            : authenticated
              ? "You're signed in, but your account does not currently have an eligible Demo plan. You can still browse the public lists."
              : "Courses, Books and Supplies are open for browsing. Sign in with an eligible Alveary plan to start planning."}
    </div>
  </>;
}
