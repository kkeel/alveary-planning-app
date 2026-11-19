"use client";

import { ArrowRight, CalendarDays, ChevronDown, HeartHandshake, MessageCircleQuestion } from "lucide-react";
import { PrioritySymbol } from "./SharedPriorityEditor";
import { usePlanningCompanion, type CompanionSection } from "./PlanningCompanionContext";

/** Matches the app's existing Course List navigation icon, in button text color. */
export function CourseListIcon({ size = 19 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10}
    aria-hidden="true" focusable="false">
    <polygon points="5.5 20 18 20 19.5 18.5 19.5 3.5 18 2 5.5 2 5.5 20"/>
    <line x1="9" y1="20" x2="9" y2="22.5"/>
    <line x1="15" y1="2" x2="15" y2="20"/>
  </svg>;
}


type Priority = "Core" | "High Interest" | "Additional";
type PriorityGuide = {
  id: Exclude<CompanionSection, "welcome" | "plan/year">;
  label: Priority;
  title: string;
  paragraphs: string[];
  considerations?: string[];
  question: string;
  suggestion: string;
};

// Based on Alveary's Course Planning Guide. Keep the useful examples and
// linked resources, rather than replacing them with generic priority advice.
const priorities: PriorityGuide[] = [
  {
    id: "priorities/core", label: "Core", title: "Start with what matters most",
    paragraphs: [
      "Begin with subjects required by your state and those your family considers essential, such as Bible, History, Geography, English/Reading, Literature, Science, and Math.",
      "You can modify a subject to fit your family. For example, grades 4 and up might study only one History stream (World, Ancient, or U.S./Canadian). You might combine students for a subject, such as 2nd and 3rd graders sharing 3rd-grade Science. In My Plan, include the course or topics that fit, and assign students together where it makes sense.",
    ],
    question: "What learning do you most want to protect in your week?",
    suggestion: "Begin with what you already know you want to teach. You can refine the rest as your plan takes shape.",
  },
  {
    id: "priorities/interest", label: "High Interest",
    title: "Make room for delight",
    paragraphs: [
      "Choose a few subjects that spark interest for each child or that your whole family would enjoy together.",
      "You can enjoy a subject all year or rotate topics by term. For example, Shakespeare, Plutarch, and Composer Study could each have a term rather than filling a whole year. Or spread a term of lessons across two terms for a slower pace. Art Instruction and Singing can work especially well that way.",
    ],
    question: "What would your children particularly love to explore?",
    suggestion: "You can enjoy a rich feast without serving every subject each week.",
  },
  {
    id: "priorities/additional", label: "Additional",
    title: "Consider what else is meaningful",
    paragraphs: [
      "Review the remaining subjects and choose one or two that feel especially important but aren't included yet. Consider those that:",
    ],
    considerations: [
      "Fulfill high school credit requirements.",
      "Reflect your family's priorities or interests.",
      "Align with a child's passions or future goals.",
    ],
    question: "Is there anything else you'd particularly like to make room for?",
    suggestion: "Save possibilities in Think Tank while you decide. Move them into My Plan when there's room.",
  },
];

const planningResources = [
  {
    title: "Relational Education",
    description: "See which subjects are intertwined.",
    href: "https://www.alveary.org/whats-new/a-relational-education",
  },
  {
    title: "Balancing the Feast",
    description: "Discover the value of often-overlooked subjects.",
    href: "https://www.alveary.org/whats-new/balancing-the-feast",
  },
  {
    title: "Tips for Combining Students",
    description: "Consider practical ways to teach together.",
    href: "https://www.alveary.org/whats-new/tips-for-combining-students",
  },
];

export function CompanionPriorities({
  compact = false, onBrowse,
}: { compact?: boolean; onBrowse?: () => void }) {
  const companion = usePlanningCompanion();
  const selected = priorities.find(item => item.id === companion.section) ?? priorities[0];

  return <div className={"pc-priorities" + (compact ? " is-compact" : "")}>
    <p className="pc-feast-intro">
      Alveary offers a feast of learning, and the Course List is your menu.
      You don't need everything on your plate to create a rich, well-balanced education.
      Choose what fits your family this year, and leave room for more later.
      A Charlotte Mason education should fit the child, not force the child to fit the curriculum.
      These priorities are optional. None of these labels is required to begin.
    </p>
    <div className="pc-priority-tabs" role="group" aria-label="Planning priorities">
      {priorities.map(item => <button type="button" key={item.id}
        aria-pressed={companion.section === item.id}
        aria-label={item.label + " Subjects"}
        title={item.label + " Subjects"}
        className={companion.section === item.id ? "is-current" : ""}
        onClick={() => companion.chooseSection(item.id)}>
        <PrioritySymbol priority={item.label} size={22}/>
        <span className="pc-priority-label" aria-hidden="true">{item.label}</span>
      </button>)}
    </div>
    <div className="pc-priority-guidance">
      <div className="pc-priority-heading">
        <PrioritySymbol priority={selected.label} size={compact ? 43 : 58}/>
        <div>
          <p className="pc-eyebrow">{selected.label} Subjects</p>
          <h3>{selected.title}</h3>
        </div>
      </div>
      {selected.paragraphs.map((paragraph, index) =>
        <p key={index}>{paragraph}</p>)}
      {selected.considerations && <ul className="pc-considerations">
        {selected.considerations.map(item => <li key={item}>{item}</li>)}
      </ul>}
      {selected.id === "priorities/additional" && <p>
        Some possibilities use Alveary resources without daily lesson plans
        (such as cooking or car maintenance), or resources outside Alveary
        (such as co-op classes or ACT preparation).
      </p>}
      <div className="pc-reflection">
        <MessageCircleQuestion size={18} aria-hidden="true"/>
        <div><strong>{selected.question}</strong><span>{selected.suggestion}</span></div>
      </div>
    </div>
    {onBrowse && <button type="button" className="pc-primary-action" onClick={onBrowse}>
      Browse courses with this guidance <ArrowRight size={15} aria-hidden="true"/>
    </button>}
  </div>;
}

/** A separate, optional library tip. Keep the three priority tips focused on
 * choosing subjects; this one bridges My Plan, Think Tank and scheduling. */
export function CompanionPlanYear({
  compact = false, onOpenPlan, onOpenSchedule,
}: { compact?: boolean; onOpenPlan: () => void; onOpenSchedule: () => void }) {
  return <div className={"pc-plan-year" + (compact ? " is-compact" : "")}>
    <div className="pc-plan-year-intro">
      <h3>From choices to a workable rhythm</h3>
      <p>After choosing your subjects, use your Alveary planning tools to shape a year
        that fits your family. You can begin simply and adjust as you go.</p>
    </div>
    <div className="pc-plan-year-steps">
      <section>
        <strong>Review My Plan</strong>
        <p>See the courses and topics you've chosen and who will study them.</p>
      </section>
      <section>
        <strong>Save possibilities in Think Tank</strong>
        <p>Not ready to include something? Save the course or topic in Think Tank,
          where it stays alongside your other planning choices. Move it into My Plan
          when there's room.</p>
      </section>
      <section>
        <strong>Build a flexible schedule</strong>
        <p>Arrange your chosen subjects with the Schedule Builder. It's a starting point,
          not a promise that everything will run smoothly on the first day.</p>
      </section>
    </div>
    <div className="pc-plan-year-actions">
      <button type="button" className="pc-primary-action" onClick={onOpenPlan}>
        Review My Plan <ArrowRight size={15} aria-hidden="true"/>
      </button>
      <button type="button" className="pc-secondary-action" onClick={onOpenSchedule}>
        Open Schedule Builder <ArrowRight size={15} aria-hidden="true"/>
      </button>
    </div>
    <details className="pc-resources" open={!compact}>
      <summary>Helpful Alveary resources <ChevronDown size={14} aria-hidden="true"/></summary>
      <ul>
        {planningResources.map(resource => <li key={resource.href}>
          <a href={resource.href} target="_blank" rel="noopener noreferrer">{resource.title}</a>
          <span>{resource.description}</span>
        </li>)}
      </ul>
    </details>
  </div>;
}

export function CompanionWelcome({
  onHelp, onContinue, onPlanYear, compact = false,
}: { onHelp: () => void; onContinue: () => void; onPlanYear: () => void; compact?: boolean }) {
  return <div className={"pc-welcome" + (compact ? " is-compact" : "")}>
    <h3>A school year that fits your family.</h3>
    <p>You don't have to plan everything at once. Start with what you know, explore what matters most, and build from there.</p>
    <div className="pc-welcome-choices">
      <button type="button" onClick={onHelp}>
        <HeartHandshake size={19} aria-hidden="true"/>
        <span><strong>Help me think it through</strong><small>Explore priorities and ways to simplify.</small></span>
        <ArrowRight size={15} aria-hidden="true"/>
      </button>
      <button type="button" onClick={onContinue}>
        <CourseListIcon/>
        <span><strong>Continue my planning</strong><small>Head directly to My Plan and your courses.</small></span>
        <ArrowRight size={15} aria-hidden="true"/>
      </button>
    </div>
    <div className="pc-tip-library">
      <h4>Planning tips</h4>
      <button type="button" onClick={onPlanYear}>
        <CalendarDays size={18} aria-hidden="true"/>
        <span><strong>Plan your year</strong><small>Take your chosen subjects into My Plan, Think Tank and Scheduling.</small></span>
        <ArrowRight size={15} aria-hidden="true"/>
      </button>
    </div>
  </div>;
}
