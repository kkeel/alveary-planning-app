"use client";

import { useId, useRef, useState } from "react";
import FloatingChoiceMenu from "./FloatingChoiceMenu";
import { Check, Layers3, Tag } from "lucide-react";
import { useDemoPlan, type SharedPriority } from "./DemoPlanContext";
import { sharedCoursePriority, sharedCourseSummary, sharedTopicOverride,
  sharedTopicPriority } from "./shared-priority.mjs";

type Priority = "Core" | "High Interest" | "Additional";
type Choice = Priority | "inherit" | "none" | "clear";

// Original 2026–27 Course Planning illustrations, already published by Alveary.
// URLs let the development app reuse the exact existing art, not replacement icons.
const priorityArt: Record<Priority, string> = {
  Core: "https://raw.githubusercontent.com/kkeel/course-picker/main/img/Core%20Subjects.png",
  "High Interest": "https://raw.githubusercontent.com/kkeel/course-picker/main/img/High%20Interest%20Subjects.png",
  Additional: "https://raw.githubusercontent.com/kkeel/course-picker/main/img/Additional%20Subjects.png",
};
const options: Priority[] = ["Core", "High Interest", "Additional"];

export function PrioritySymbol({ priority, size = 18 }: {
  priority: Priority | "Varied" | null;
  size?: number;
}) {
  if (priority === "Varied") return <Layers3 size={size - 2} aria-hidden="true"/>;
  if (priority) return <img src={priorityArt[priority]} width={size} height={size}
    alt="" aria-hidden="true" loading="lazy" decoding="async"/>;
  return <Tag size={size - 3} aria-hidden="true"/>;
}

/** A tiny always-available action, not a form field in the reading flow.
 * One click opens the menu; selecting a value autosaves without a Done step.
 * Assignment membership and course/topic priority inheritance are untouched. */
export default function SharedPriorityEditor({
  courseId, topicId = null, selectedTopicIds = [], compact = false,
  disabled = false, displayPriority,
}: {
  courseId: string;
  topicId?: string | null;
  selectedTopicIds?: string[];
  compact?: boolean;
  disabled?: boolean;
  displayPriority?: "Core" | "High Interest" | "Additional" | "Varied" | null;
}) {
  const plan = useDemoPlan();
  const [open,setOpen] = useState(false);
  const id = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const shared = plan.sharedPriorities;
  const courseValue = sharedCoursePriority(shared,courseId);
  const topicValue = topicId === null ? "inherit" :
    sharedTopicOverride(shared,courseId,topicId);
  const effectiveTopic = topicId === null ? null :
    sharedTopicPriority(shared,courseId,topicId);
  const summary = topicId === null && selectedTopicIds.length
    ? sharedCourseSummary(shared,courseId,selectedTopicIds) : null;
  const shown = displayPriority !== undefined ? displayPriority :
    topicId === null ? summary ?? courseValue : effectiveTopic;
  const activeValue = topicId === null ? courseValue : topicValue;
  const hasCustomTopics = topicId === null && selectedTopicIds.some(id =>
    sharedTopicOverride(shared,courseId,id) !== "inherit");

  function change(choice: Choice) {
    const picked: SharedPriority["priority"] | null = choice === "inherit" ||
      choice === "clear" ? null : choice === "none" ? "Not set" : choice;
    // Picking the course's current effective priority on a topic means
    // "same as course", not a permanent redundant topic override.
    const base = sharedCoursePriority(shared,courseId);
    const effectiveBase = base === "Not set" ? null : base;
    const effectivePick = picked === "Not set" ? null : picked;
    const next: SharedPriority["priority"] | null =
      topicId !== null && effectivePick === effectiveBase ? null : picked;
    if (!plan.courses.some(course => course.courseId === courseId)) {
      // A priority on an unchosen course is an idea, not a student assignment.
      // A topic-first priority saves only its topic through the correct parent.
      if (topicId === null) plan.addChoice(courseId);
      else plan.toggleListIdea(courseId,topicId);
    }
    plan.setSharedPriority(courseId,topicId,next);
    setOpen(false);
    triggerRef.current?.focus();
  }

  const name = shown === "Varied" ? "Varied priorities" :
    shown ? "Priority: " + shown : "Set priority";
  const hint = topicId !== null && topicValue === "inherit" && effectiveTopic
    ? name + " (same as course)" : name;
  const selectedChoice = topicId === null ? courseValue ?? "clear" :
    topicValue === "inherit" ? "inherit" :
    topicValue === "Not set" ? "none" : topicValue;
  const menuChoices: {value:Choice; label:string; art?:Priority}[] = [
    ...(topicId !== null ? [{value:"inherit" as const,label:"Same as course"}] : []),
    ...options.map(value=>({value,label:value,art:value})),
    {value:topicId === null ? "clear" : "none",
      label:topicId === null ? "Clear priority" : "No priority"},
  ];

  return <div className={"priority-control" +
      (compact ? " is-compact" : "") +
      (shown ? " has-priority" : "") +
      (shown === "Varied" ? " is-varied" : "") +
      (topicId !== null && topicValue === "inherit" ? " is-inherited" : "")}
    onClick={event=>event.stopPropagation()}>
    <button type="button" ref={triggerRef} className="planning-icon-control priority-control-trigger"
      aria-label={hint} title={hint} aria-expanded={open} aria-controls={id}
      disabled={disabled || !plan.ready}
      onClick={()=>setOpen(value=>!value)}>
      <PrioritySymbol priority={shown === "Varied" || shown === "Core" ||
        shown === "High Interest" || shown === "Additional" ? shown : null}
        size={compact ? 18 : 21}/>
    </button>
    <FloatingChoiceMenu open={open} triggerRef={triggerRef}
      onDismiss={()=>setOpen(false)} id={id}
      label={topicId===null?"Course priority":"Topic priority"}>
      <div className="priority-control-heading">Priority <span>optional</span></div>
      {menuChoices.map(option=><button key={option.value} type="button"
        className="priority-option" aria-pressed={selectedChoice === option.value}
        onClick={()=>change(option.value)}>
        {option.art ? <PrioritySymbol priority={option.art} size={22}/> :
          <span className="priority-option-placeholder" aria-hidden="true"/>}
        <span>{option.label}</span>
        {selectedChoice===option.value && <Check size={14} aria-hidden="true"/>}
      </button>)}
      {hasCustomTopics && <p className="priority-control-note">
        Topics you've changed keep their own priorities.
      </p>}
    </FloatingChoiceMenu>
  </div>;
}
