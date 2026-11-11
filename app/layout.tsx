import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Alveary Planning · Development",
  description: "Development foundation for the Alveary planning experience.",
  robots: { index: false, follow: false },
};

const navigation = [
  { href: "/", label: "Overview" },
  { href: "/courses", label: "Courses" },
  { href: "/books", label: "Books" },
  { href: "/supplies", label: "Supplies" },
  { href: "/planning", label: "Planning" },
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
              {navigation.map((item) => (
                <Link key={item.href} href={item.href}>{item.label}</Link>
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
