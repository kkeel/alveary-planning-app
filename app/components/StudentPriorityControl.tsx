"use client";

import { useId, useRef, useState } from "react";
import FloatingChoiceMenu from "./FloatingChoiceMenu";
import { Check } from "lucide-react";
import { useDemoPlan } from "./DemoPlanContext";
import { effectivePlanningPriority } from "./shared-priority.mjs";
import { PrioritySymbol } from "./SharedPriorityEditor";

type Priority = "Core"|"High Interest"|"Additional";
const priorities: Priority[] = ["Core","High Interest","Additional"];

/** A student sees their effective inherited priority, with the option to
 * customize only that student's course or topic selection. A change here does
 * not rewrite the shared course or topic preference. */
export default function StudentPriorityControl({
  courseId, studentId, studentName, topicId=null, disabled=false, onChanged,
}: {
  courseId:string; studentId:string; studentName:string;
  topicId?:string|null; disabled?:boolean; onChanged?:()=>void;
}) {
  const plan=useDemoPlan();
  const [open,setOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuId=useId();
  const specific=plan.assignmentPriorities.find(p=>p.courseId===courseId &&
    p.studentId===studentId && p.topicId===topicId);
  const effective=effectivePlanningPriority(
    plan.sharedPriorities,plan.assignmentPriorities,courseId,topicId,studentId);
  const inherited=!specific;
  const label=effective ? effective : "No priority";
  function choose(priority:Priority|"inherit"|"Not set"){
    // Choosing the inherited value is equivalent to Same as plan.
    // Remove a redundant saved override so future parent edits flow through.
    const withoutThis=plan.assignmentPriorities.filter(p=>!(
      p.courseId===courseId && p.studentId===studentId && p.topicId===topicId));
    const inheritedValue=effectivePlanningPriority(
      plan.sharedPriorities,withoutThis,courseId,topicId,studentId);
    const next=priority==="inherit" ||
      (priority==="Not set"?null:priority)===inheritedValue
      ? null : priority;
    plan.setAssignmentPriority(courseId,studentId,topicId,next);
    onChanged?.();
    setOpen(false);
    triggerRef.current?.focus();
  }
  const current=specific?.priority ?? "inherit";
  const items:{value:Priority|"inherit"|"Not set";label:string;art?:Priority}[]=[
    {value:"inherit",label:"Same as plan"},
    ...priorities.map(priority=>({value:priority,label:priority,art:priority})),
    ...(topicId ? [{value:"Not set" as const,label:"No priority"}] : []),
  ];
  return <div className={"priority-control student-priority-control"+
    (effective?" has-priority":"")+(inherited?" is-inherited":" is-custom")}
    onClick={event=>event.stopPropagation()}>
    <button ref={triggerRef} type="button" className="priority-control-trigger"
      aria-label={studentName+": "+label+(inherited?", inherited":", customized")+
        (disabled?". Assign student to change.":". Change priority.")}
      title={studentName+" · "+label+(inherited?" (inherited)":" (customized)")}
      aria-expanded={open} aria-controls={menuId}
      disabled={disabled || !plan.ready}
      onClick={()=>setOpen(v=>!v)}>
      <PrioritySymbol priority={effective as Priority|null} size={21}/>
    </button>
    <FloatingChoiceMenu open={open} triggerRef={triggerRef}
      onDismiss={()=>setOpen(false)} id={menuId} label={"Priority for "+studentName}>
      <div className="priority-control-heading">{studentName}
        <span>Priority</span></div>
      {items.map(item=><button type="button" key={item.value}
        className="priority-option" aria-pressed={current===item.value}
        onClick={()=>choose(item.value)}>
        {item.art ? <PrioritySymbol priority={item.art} size={22}/> :
          <span className="priority-option-placeholder" aria-hidden="true"/>}
        <span>{item.label}</span>
        {current===item.value && <Check size={14} aria-hidden="true"/>}
      </button>)}
      {specific && <p className="priority-control-note">
        This only changes {studentName}'s priority.
      </p>}
    </FloatingChoiceMenu>
  </div>;
}
