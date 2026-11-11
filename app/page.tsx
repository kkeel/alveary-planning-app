import Link from "next/link";

const links = [
  { href: "/courses", title: "Courses", description: "Browse and compare subjects, courses, and topics." },
  { href: "/books", title: "Books", description: "Explore the books and resources behind your choices." },
  { href: "/supplies", title: "Supplies", description: "See what to purchase, gather, and prepare." },
  { href: "/scheduling", title: "Schedule", description: "Shape a daily and weekly rhythm that works for you." },
  { href: "/year-at-a-glance", title: "Year at a glance", description: "Step back and see your school year in one place." },
  { href: "/lesson-plans", title: "Lesson plans", description: "A future home for authorized lesson resources." },
  { href: "/exams", title: "Exams", description: "Locate examination resources when available." },
];

export default function Home() {
  return (
    <>
      <div className="dashboard-header">
        <p className="eyebrow">Alveary · 2027–28 testing</p>
        <h1>Planning Dashboard</h1>
        <p>A place to prepare for a year of rich and delightful learning.</p>
      </div>

      <div className="dashboard-content">
        <section className="dashboard-feature" aria-labelledby="getting-started">
          <div>
            <h2 id="getting-started">Getting started</h2>
            <p>
              We want you to feel confident and prepared as you make decisions for your school year.
              Explore your options, begin with the subjects you already know you want, and build from there.
              You don&apos;t need to decide everything at once.
            </p>
          </div>
          <aside className="dashboard-feature-aside">
            <p className="feature-aside-title">Begin with what you know</p>
            <p className="feature-aside-note">Choose a course. Explore the books. Make a plan that fits your family, one decision at a time.</p>
          </aside>
        </section>

        <div className="dashboard-invite">
          <p><strong>Prepare your school year</strong> · Your planning tools are gathered here.</p>
          <Link href="/planning">OPEN PLANNING OVERVIEW</Link>
        </div>

        <h2 className="dashboard-section-title">Explore your planning tools</h2>
        <p className="dashboard-intro">These sections are being developed. Public browsing will remain available while member-specific features are connected securely.</p>
        <div className="grid">
          {links.map((section) => (
            <Link className="card" href={section.href} key={section.href}>
              <h2>{section.title}</h2>
              <p>{section.description}</p>
            </Link>
          ))}
        </div>

        <div className="notice">
          This is the new Alveary Planning development site. It does not yet read your membership, student profiles, selections, or scheduling information.
        </div>
      </div>
    </>
  );
}
