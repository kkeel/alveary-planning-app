"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { usePlanningDesk } from "../components/PlanningDeskContext";

export default function BooksPage() {
  const desk = usePlanningDesk();
  return (
    <>
      <Link className="books-back-to-planning" href="/courses"
        onClick={() => desk.setCourseMode("plan")}>
        <ArrowLeft size={16}/> Back to Course List · Planning
      </Link>
      <h1>Book List</h1>
      <p className="lead">Explore living books and resources before organizing the choices that fit your family.</p>
      <div className="notice">The Book List is our next build. The Planning Desk already carries your saved course and topic ideas across from Courses.</div>
    </>
  );
}
