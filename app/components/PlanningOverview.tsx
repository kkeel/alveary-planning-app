"use client";

import Link from "next/link";
import { ArrowRight, Compass, HeartHandshake, NotebookPen } from "lucide-react";
import { usePlanningCompanion } from "./PlanningCompanionContext";
import { usePlanningDesk } from "./PlanningDeskContext";
import { usePlannerAuth } from "./PlannerAuthProvider";

/** Public browsing is open; member planning entry points use an auth-aware preview. */
export default function PlanningOverview() {
  const { status, authenticated, planAccess } = usePlannerAuth();
  const signedIn = status === "signed-in";
  const companion = usePlanningCompanion();
  const desk = usePlanningDesk();

  return <>
    <h1>Planning Overview</h1>
    <p className="lead">Start with what you already know and build your school-year plan from there.</p>
    {signedIn && <section className="pc-overview-intro" aria-label="Planning Companion starting point">
      <div className="pc-overview-heading">
        <Compass size={25} aria-hidden="true"/>
        <div><h2>Planning a year that fits your family</h2>
          <p>Choose a little guidance, or start with what you already know. Both are good places to begin.</p></div>
      </div>
      <div className="pc-overview-actions">
        <Link href="/companion" onClick={() => companion.chooseSection("welcome")}>
          <HeartHandshake size={17} aria-hidden="true"/> Help me think it through <ArrowRight size={15} aria-hidden="true"/>
        </Link>
        <Link href="/courses" onClick={() => {
          desk.setCourseMode("browse");
          desk.setTab("plan");
          desk.setQuiet(false);
          companion.close();
        }}>
          <NotebookPen size={17} aria-hidden="true"/> Continue my planning <ArrowRight size={15} aria-hidden="true"/>
        </Link>
      </div>
    </section>}
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
