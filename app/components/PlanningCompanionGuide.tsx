"use client";

import { ArrowRight, HeartHandshake, Lightbulb, Sparkles } from "lucide-react";
import { usePlanningCompanion, type CompanionSection } from "./PlanningCompanionContext";

const priorities: { id: Exclude<CompanionSection, "welcome">; label: string; title: string;
  lead: string; description: string; question: string; suggestion: string }[] = [
  {
    id: "priorities/core", label: "Core", title: "Start with what matters most",
    lead: "Core Subjects",
    description: "Consider the subjects required by your state and the learning your family sees as essential. Some subjects may be simplified or combined between students. Core is a family decision, not a universal list every member must complete.",
    question: "What learning do you most want to protect in your week?",
    suggestion: "Begin with what you already know you'd like to teach. You can refine the rest as your plan takes shape.",
  },
  {
    id: "priorities/interest", label: "High Interest", title: "Make room for delight",
    lead: "High Interest Subjects",
    description: "Notice which subjects especially capture your children's interest. You may enjoy one all year, rotate subjects by term, or spread a term's lessons over a longer period.",
    question: "What would your children particularly love to explore?",
    suggestion: "A rich school year doesn't require every wonderful subject every week.",
  },
  {
    id: "priorities/additional", label: "Additional", title: "Consider what else is meaningful",
    lead: "Additional Subjects",
    description: "Think about family interests, high school credits, and future goals. Some subjects may come from outside Alveary, and others may be better saved for another term or year.",
    question: "Is there anything else you'd particularly like to make room for?",
    suggestion: "You can save ideas in Think Tank before deciding whether they fit in My Plan.",
  },
];

export function CompanionPriorities({
  compact = false, onBrowse,
}: { compact?: boolean; onBrowse?: () => void }) {
  const companion = usePlanningCompanion();
  const selected = priorities.find(item => item.id === companion.section) ?? priorities[0];
  return <div className={"pc-priorities" + (compact ? " is-compact" : "")}>
    <div className="pc-priority-tabs" role="group" aria-label="Planning priorities">
      {priorities.map(item => <button type="button" key={item.id}
        aria-pressed={companion.section === item.id}
        className={companion.section === item.id ? "is-current" : ""}
        onClick={() => companion.chooseSection(item.id)}>{item.label}</button>)}
    </div>
    <div className="pc-priority-guidance">
      <p className="pc-eyebrow">{selected.lead}</p>
      <h3>{selected.title}</h3>
      <p>{selected.description}</p>
      <div className="pc-reflection">
        <Sparkles size={15} aria-hidden="true"/>
        <div><strong>{selected.question}</strong><span>{selected.suggestion}</span></div>
      </div>
    </div>
    <p className="pc-reassurance"><Lightbulb size={14} aria-hidden="true"/>
      You can choose courses now and set priorities later. None of these labels is required.
    </p>
    {onBrowse && <button type="button" className="pc-primary-action" onClick={onBrowse}>
      Browse courses with this guidance <ArrowRight size={15} aria-hidden="true"/>
    </button>}
  </div>;
}

export function CompanionWelcome({
  onHelp, onContinue, compact = false,
}: { onHelp: () => void; onContinue: () => void; compact?: boolean }) {
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
        <ArrowRight size={19} aria-hidden="true"/>
        <span><strong>Continue my planning</strong><small>Head directly to My Plan and your courses.</small></span>
        <ArrowRight size={15} aria-hidden="true"/>
      </button>
    </div>
  </div>;
}
