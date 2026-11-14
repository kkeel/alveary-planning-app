"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePlanningDesk } from "../components/PlanningDeskContext";
import { usePlannerAuth } from "../components/PlannerAuthProvider";

export default function BooksPage() {
  const desk = usePlanningDesk();
  const { status } = usePlannerAuth();
  const signedIn = status === "signed-in";
  return (
    <>
      {signedIn && <Link className="books-back-to-planning" href="/courses"
        onClick={() => desk.setCourseMode("plan")}>
        <ArrowLeft size={16}/> Back to Course List · Planning
      </Link>}
      <h1>Book List</h1>
      <p className="lead">Explore living books and resources before organizing the choices that fit your family.</p>
      <div className="notice">{signedIn
          ? "The Book List is our next build. The Planning Desk carries your browser-only draft course ideas across from Courses."
          : "The public Book List is being prepared. Sign in with Alveary to use the planning preview."}</div>
    </>
  );
}
