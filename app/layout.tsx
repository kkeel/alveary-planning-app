import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alveary Planning · Development",
  description: "Development foundation for the Alveary planning experience.",
  robots: { index: false, follow: false },
};

// Navigation destinations are scaffolds, not decisions about free or paid permissions.
const navigation = [
  {
    heading: "Explore",
    items: [
      { href: "/courses", label: "Courses" },
      { href: "/books", label: "Books" },
      { href: "/supplies", label: "Supplies" },
    ],
  },
  {
    heading: "Plan",
    items: [
      { href: "/planning", label: "Planning Overview" },
      { href: "/scheduling", label: "Scheduling" },
      { href: "/year-at-a-glance", label: "Year at a Glance" },
    ],
  },
  {
    heading: "Curriculum resources",
    items: [
      { href: "/lesson-plans", label: "Lesson Plans" },
      { href: "/exams", label: "Exams" },
    ],
  },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <header className="site-header">
            <Link href="/" className="brand" aria-label="Alveary Planning home">
              <span className="brand-icon" aria-hidden="true">A</span>
              <span>Alveary <strong>Planning</strong></span>
            </Link>
            <span className="environment">Development preview</span>
          </header>
          <div className="app-layout">
            <nav className="sidebar" aria-label="Main navigation">
              <Link href="/" className="overview-link">Dashboard</Link>
              {navigation.map((group) => (
                <div className="nav-group" key={group.heading}>
                  <span className="nav-heading">{group.heading}</span>
                  {group.items.map((item) => (
                    <Link key={item.href} href={item.href}>{item.label}</Link>
                  ))}
                </div>
              ))}
            </nav>
            <main className="main-content">{children}</main>
          </div>
          <footer className="site-footer">
            This preview uses test and placeholder content. Membership access is not connected yet.
          </footer>
        </div>
      </body>
    </html>
  );
}
