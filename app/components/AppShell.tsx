"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import AuthStatusBar from "./AuthStatusBar";
import { PlannerAuthProvider, usePlannerAuth } from "./PlannerAuthProvider";
import PlanningDesk from "./PlanningDesk";
import { PlanningDeskProvider, usePlanningDesk } from "./PlanningDeskContext";
import {
  ArrowLeft, ChevronRight, Compass, Menu,
  PanelLeftClose, PanelLeftOpen, Search, X,
} from "lucide-react";

type NavItem = {
  href: string;
  label: string;
  icon: string;
};

const navigation: NavItem[] = [
  { href: "/", label: "Planning overview", icon: "planning" },
  { href: "/students", label: "Students", icon: "students" },
  { href: "/courses", label: "Courses", icon: "courses" },
  { href: "/scheduling", label: "Schedule", icon: "schedule" },
  { href: "/books", label: "Books", icon: "books" },
  { href: "/lesson-plans", label: "Lesson plans", icon: "lesson-plans" },
  { href: "/supplies", label: "Supplies", icon: "supplies" },
  { href: "/exams", label: "Exams", icon: "exams" },
];

const memberOnlyPaths = new Set(["/students", "/scheduling", "/lesson-plans", "/exams", "/year-at-a-glance"]);

const planningItems: NavItem[] = [
  { href: "/year-at-a-glance", label: "Year at a glance", icon: "year-at-a-glance" },
];

// The development return link targets the provided Webflow testing dashboard.
// It can be replaced with the production URL when that dashboard is ready.
const alvearyReturnUrl = process.env.NEXT_PUBLIC_ALVEARY_DASHBOARD_URL || "https://alveary.org/alveary-2027-2028/dashboard-test";
const alvearyReturnLabel = "Member dashboard";
const assetsBase = process.env.NEXT_PUBLIC_BASE_PATH || "";
const iconUrl = (name: string) => `${assetsBase}/brand/navigation/${name}.svg`;

function AlvearyMark() {
  return (
    <img
      className="alveary-mark"
      src={`${assetsBase}/brand/logos/alveary-mark.png`}
      width={34}
      height={34}
      alt=""
      aria-hidden="true"
    />
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const currentPath = pathname.replace(/\/$/, "") || "/";
  // The old /planning URL is a compatibility alias for the new home page.
  const activePath = currentPath === "/planning" ? "/" : currentPath;
  const current = [...navigation, ...planningItems].find((item) => item.href === activePath);
  const currentName = current?.label ?? "Planning";
  const [collapsed, setCollapsed] = useState(true); // Start with the slim icon rail; members can expand it any time.
  const [mobileOpen, setMobileOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const { courseMode, setCourseMode } = usePlanningDesk();
  const { status } = usePlannerAuth();
  const signedIn = status === "signed-in";
  const checking = status === "checking";
  // Reset the default mode when a browser session becomes signed in or public.
  // An authenticated member can still manually select List mode afterward.
  useEffect(() => {
    if (!checking) setCourseMode(signedIn ? "plan" : "browse");
  }, [checking, signedIn, setCourseMode]);
  const showDesk = signedIn && (activePath === "/books" ||
    (activePath === "/courses" && courseMode === "plan"));

  const allRoutes = [...navigation, ...planningItems]
    .filter(item => signedIn || !memberOnlyPaths.has(item.href));
  const matches = search.trim()
    ? allRoutes.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()))
    : [];

  function renderItem(item: NavItem) {
    const active = activePath === item.href;
    return (
      <Link
        href={item.href}
        key={item.href}
        className={`side-link ${active ? "is-active" : ""}`}
        aria-current={active ? "page" : undefined}
        title={collapsed ? item.label : undefined}
        onClick={() => setMobileOpen(false)}
      >
        <img className="side-icon" src={iconUrl(item.icon)} alt="" aria-hidden="true" width="19" height="19" />
        <span className="side-link-label">{item.label}</span>
        {!collapsed && <ChevronRight className="side-chevron" size={14} aria-hidden="true" />}
      </Link>
    );
  }

  function goToFirstSearchResult() {
    if (!matches[0]) return;
    router.push(matches[0].href);
    setSearch("");
    setSearchActive(false);
  }

  return (
    <div className={`alveary-shell ${collapsed ? "is-collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
      <aside className="alveary-sidebar" aria-label="Alveary navigation">
        <div className="sidebar-brand-row">
          <a
            className="alveary-brand"
            href={alvearyReturnUrl}
            aria-label="Alveary — return to the member dashboard"
          >
            <AlvearyMark />
            <span className="alveary-wordmark">Alveary</span>
          </a>
          <button
            className="collapse-control"
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
          >
            {collapsed ? <PanelLeftOpen size={17} /> : <PanelLeftClose size={17} />}
          </button>
        </div>

        <div className="sidebar-prep-wrap">
          <Link className="sidebar-prep" href="/" title="Prepare your school year">
            <Compass size={17} strokeWidth={1.6} aria-hidden="true" />
            <span>Prepare your school year</span>
            {!collapsed && <ChevronRight size={15} aria-hidden="true" />}
          </Link>
        </div>

        <nav className="side-nav" aria-label="Planning pages">
          {navigation.filter(item => signedIn || !memberOnlyPaths.has(item.href)).map(renderItem)}
          {signedIn && <>
            <div className="side-divider" />
            <p className="side-group-heading">Your planning workspace</p>
            {planningItems.map(renderItem)}
          </>}
        </nav>

        <div className="sidebar-bottom">
          <a className="sidebar-return" href={alvearyReturnUrl}>
            <ArrowLeft size={17} aria-hidden="true" />
            <span>Return to {alvearyReturnLabel}</span>
          </a>
          <div className="sidebar-preview">
            <span className="preview-dot" aria-hidden="true" />
            <span>2027–28 development preview</span>
          </div>
        </div>
      </aside>

      <div className="shell-workspace">
        <header className="shell-topbar">
          <div className="shell-breadcrumbs">
            <button
              className="mobile-menu-toggle"
              type="button"
              onClick={() => setMobileOpen((value) => !value)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
            <a href={alvearyReturnUrl} className="breadcrumb-alveary" title="Return to member dashboard">Alveary</a>
            <ChevronRight size={13} aria-hidden="true" />
            <Link href="/">Planning</Link>
            <ChevronRight size={13} aria-hidden="true" />
            <strong>{currentName}</strong>
          </div>

          <div className="shell-top-actions">
            <form
              className="page-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                goToFirstSearchResult();
              }}
            >
              <label className="sr-only" htmlFor="page-search-input">Find a planning page</label>
              <input
                id="page-search-input"
                type="search"
                placeholder="Find a planning page"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onFocus={() => setSearchActive(true)}
                onBlur={() => setTimeout(() => setSearchActive(false), 150)}
                autoComplete="off"
              />
              <button type="submit" aria-label="Go to first matching page">
                <Search size={17} aria-hidden="true" />
              </button>
              {searchActive && search.trim() && (
                <div className="page-search-results">
                  {matches.length ? matches.map((item) => (
                    <Link
                      href={item.href}
                      key={item.href}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => {
                        setSearch("");
                        setSearchActive(false);
                      }}
                    >
                      {item.label}
                    </Link>
                  )) : <p>No matching planning pages</p>}
                </div>
              )}
            </form>
            <a
              className="topbar-return topbar-return-icon"
              href={alvearyReturnUrl}
              title="Return to Alveary member dashboard"
              aria-label="Return to Alveary member dashboard"
            >
              <img src={iconUrl("dashboard")} width={21} height={21} alt="" aria-hidden="true" />
            </a>
          </div>
        </header>

        <AuthStatusBar />

        <div className={"shell-page-layout" + (showDesk ? " has-planning-desk" : "")}>
          <main className="shell-main" id="main-content">
            {memberOnlyPaths.has(activePath) && !signedIn ? <div className="notice" role="status">
              {checking ? "Checking your Alveary sign-in…" :
                "This planning page is for signed-in Alveary members. Sign in to see the development preview. Public Courses, Books and Supplies remain available."}
            </div> : children}
          </main>
          {showDesk && <PlanningDesk />}
        </div>
        <footer className="shell-footer">
          Alveary Planning · Development preview · Not the live member planner
        </footer>
      </div>
    </div>
  );
}

function SessionPlanningShell({ children }: { children: ReactNode }) {
  const { userId } = usePlannerAuth();
  // Drafts are still browser-local and are intentionally *not* copied between
  // different account identities on the same device.
  return <PlanningDeskProvider key={userId ?? "public"} storageScope={userId ?? "public"}>
    <AppShellInner>{children}</AppShellInner>
  </PlanningDeskProvider>;
}

export default function AppShell({ children }: { children: ReactNode }) {
  return <PlannerAuthProvider><SessionPlanningShell>{children}</SessionPlanningShell></PlannerAuthProvider>;
}
