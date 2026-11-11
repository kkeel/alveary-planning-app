import Link from "next/link";

const sections = [
  { href: "/courses", title: "Explore courses", description: "A public-first home for curriculum discovery and comparison." },
  { href: "/books", title: "Browse books", description: "Public book information, with personal planning tools to follow." },
  { href: "/supplies", title: "Browse supplies", description: "A clearer way to explore the materials behind a school year." },
  { href: "/planning", title: "Build a plan", description: "Our future free and member-enhanced planning workspace." },
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
      <div className="notice">This is a development foundation, not the live Alveary application. Curriculum records and member sign-in will be connected in later steps.</div>
    </>
  );
}
