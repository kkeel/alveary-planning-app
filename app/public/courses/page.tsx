import CourseExplorer from "../../courses/CourseExplorer";
import "../../courses/course-explorer.css";

// This published catalog is read-only. AppShell's explicit /public route
// prevents Memberstack sign-in and all private planning access checks.
export default function PublicCoursesPage() {
  return <CourseExplorer />;
}
