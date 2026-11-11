import Link from "next/link";

const sections = [
  { href: "/courses", title: "Explore courses", description: "Discover subjects, courses, and topics." },
  { href: "/books", title: "Browse books", description: "Review resources and book choices." },
  { href: "/supplies", title: "Browse supplies", description: "Understand the materials you may need." },
  { href: "/planning", title: "Plan your year", description: "Bring your choices together in one place." },
  { href: "/scheduling", title: "Build a schedule", description: "Arrange lessons in a rhythm that fits your family." },
  { href: "/year-at-a-glance", title: "See the full year", description: "Zoom out to your school-year overview." },
  { href: "/lesson-plans", title: "Lesson plans", description: "Find lesson materials when permitted." },
  { href: "/exams", title: "Exams", description: "Find examination resources when permitted." },
];

export default function Home() {
  return (
    <>
      <p className="eyebrow">Alveary planning · Early development</p>
      <h1>A calmer way to plan your school year.</h1>
      <p className="lead">Explore the curriculum, understand your choices, and build a plan that works for your family—one step at a time.</p>
      <div className="grid">
        {sections.map((section) => (
          <Link className="card" href={section.href} key={section.href}>
            <h2>{section.title}</h2>
            <p>{section.description}</p>
          </Link>
        ))}
      </div>
      <div className="notice">This is a development foundation, not the live Alveary application. Curriculum records, member sign-in, and free/paid permissions are not connected yet.</div>
    </>
  );
}
