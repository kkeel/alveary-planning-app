"use client";

import { useEffect, useId, useRef, useState } from "react";
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
  const rootRef=useRef<HTMLDivElement>(null);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuId=useId();
  const specific=plan.assignmentPriorities.find(p=>p.courseId===courseId &&
    p.studentId===studentId && p.topicId===topicId);
  const effective=effectivePlanningPriority(
    plan.sharedPriorities,plan.assignmentPriorities,courseId,topicId,studentId);
  const inherited=!specific;
  const label=effective ? effective : "No priority";
  useEffect(()=>{
    if(!open) return;
    const outside=(event:PointerEvent)=>{
      if(!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const keydown=(event:KeyboardEvent)=>{
      if(event.key==="Escape") {setOpen(false);triggerRef.current?.focus();}
    };
    document.addEventListener("pointerdown",outside);
    document.addEventListener("keydown",keydown);
    return ()=>{
      document.removeEventListener("pointerdown",outside);
      document.removeEventListener("keydown",keydown);
    };
  },[open]);
  function choose(priority:Priority|"inherit"|"Not set"){
    plan.setAssignmentPriority(courseId,studentId,topicId,
      priority==="inherit" ? null : priority);
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
  return <div ref={rootRef} className={"priority-control student-priority-control"+
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
    {open && <div id={menuId} className="priority-control-popover"
      role="group" aria-label={"Priority for "+studentName}>
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
    </div>}
  </div>;
}
