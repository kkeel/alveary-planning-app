"use client";

import { useId, useRef, useState } from "react";
import FloatingChoiceMenu from "./FloatingChoiceMenu";
import { Check, Clock3 } from "lucide-react";
import { useDemoPlan } from "./DemoPlanContext";
import { courseArrangement, topicArrangementOverride, effectiveArrangement } from "./arrangement-inheritance.mjs";

type Arrangement = "Combined" | "Separate" | "Later";
type Choice = Arrangement | "inherit" | "Both";

/** The same lightweight, autosaving popover pattern used by priorities.
 * Course-level and topic-level choices stay distinct: selecting a topic
 * arrangement doesn't overwrite the student's course arrangement. */
export function ArrangementSymbol({value, size=19}:{
 value: Arrangement | "Both"; size?:number;
}) {
  if (value==="Later") return <Clock3 size={size} aria-hidden="true"/>;
  return <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.8"
      strokeLinecap="round" aria-hidden="true">
    {value==="Separate" ? <>
      <circle cx="7" cy="12" r="5"/>
      <circle cx="18" cy="12" r="5"/>
    </> : <>
      <circle cx="9" cy="12" r="7"/>
      <circle cx="15" cy="12" r="7"/>
    </>}
  </svg>;
}

export default function StudentArrangementControl({
  courseId,studentId,studentName,topicId=null,onChanged,
}:{
  courseId:string; studentId:string; studentName:string; topicId?:string|null;
  onChanged?:()=>void;
}){
  const plan=useDemoPlan();
  const [open,setOpen]=useState(false);
  const triggerRef=useRef<HTMLButtonElement>(null);
  const menuId=useId();
  const base=courseArrangement(plan.assignmentArrangements,courseId,studentId) as Arrangement|"Both";
  const topic=topicId ? topicArrangementOverride(
    plan.assignmentArrangements,courseId,studentId,topicId) : "inherit";
  const effective=effectiveArrangement(
    plan.assignmentArrangements,courseId,studentId,topicId) as Arrangement|"Both";
  const selected:Choice=topicId ? topic as Choice : base;
  const inherited=topicId!==null && topic==="inherit";
  const caption=(effective==="Later"?"Decide later":effective==="Both"?"Both (previous setting)":effective);
  function choose(value:Choice){
    if(value==="Both") return; // legacy read-only value
    plan.setAssignmentArrangement(courseId,studentId,topicId,
      value==="inherit"?null:value);
    onChanged?.();
    setOpen(false);
    triggerRef.current?.focus();
  }
  const choices:{value:Choice;label:string;display:Arrangement|"Both"|null}[]=[
    ...(topicId?[{value:"inherit" as Choice,label:"Same as course",display:base}]:[]),
    {value:"Combined",label:"Combined",display:"Combined"},
    {value:"Separate",label:"Separate",display:"Separate"},
    {value:"Later",label:"Decide later",display:"Later"},
    ...(selected==="Both"?[{value:"Both" as Choice,label:"Both (previous setting)",display:"Both" as const}]:[]),
  ];
  return <div
      className={"student-arrangement-control"+(inherited?" is-inherited":"")}
      onClick={event=>event.stopPropagation()}>
    <button type="button" ref={triggerRef} className="student-arrangement-trigger"
      disabled={!plan.ready} aria-expanded={open} aria-controls={menuId}
      aria-label={studentName+": "+caption+" arrangement"+(inherited?" (same as course)":"")+". Change arrangement"}
      title={studentName+" · "+caption+" arrangement"+(inherited?" (same as course)":"")}
      onClick={()=>setOpen(v=>!v)}>
      <ArrangementSymbol value={effective} size={19}/>
    </button>
    <FloatingChoiceMenu open={open} triggerRef={triggerRef}
      onDismiss={()=>setOpen(false)} id={menuId}
      className="student-arrangement-popover" label={"Arrangement for "+studentName}>
      <div className="priority-control-heading">{studentName}<span>Arrangement</span></div>
      {choices.map(item=><button type="button" key={item.value}
        className="priority-option" aria-pressed={selected===item.value}
        disabled={item.value==="Both"}
        onClick={()=>choose(item.value)}>
        <span className="student-arrangement-choice-icon">
          {item.display?<ArrangementSymbol value={item.display} size={19}/>:null}
        </span>
        <span>{item.label}</span>
        {selected===item.value && <Check size={14} aria-hidden="true"/>}
      </button>)}
    </FloatingChoiceMenu>
  </div>;
}
