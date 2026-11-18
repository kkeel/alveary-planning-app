"use client";

import { useId, useRef, useState } from "react";
import FloatingChoiceMenu from "./FloatingChoiceMenu";
import { Check, Clock3 } from "lucide-react";
import { useDemoPlan } from "./DemoPlanContext";
import { courseArrangement, topicArrangementOverride, effectiveArrangement } from "./arrangement-inheritance.mjs";

type Arrangement = "Combined" | "Separate" | "Later";
type Choice = "Combined" | "Separate" | "inherit" | "Both";

/** A quiet invitation to arrange: the exact same two separate circles as
 * the selected Separate state, only lighter. Unset is NEVER saved as Separate. */
export function ArrangementPlaceholderSymbol({size=19}:{size?:number}) {
  return <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth="1.7"
    strokeLinecap="round" aria-hidden="true">
    <circle cx="7" cy="12" r="5"/>
    <circle cx="18" cy="12" r="5"/>
  </svg>;
}

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
  const base=courseArrangement(plan.assignmentArrangements,courseId,studentId,
    plan.sharedArrangements) as Arrangement|"Both";
  const topic=topicId ? topicArrangementOverride(
    plan.assignmentArrangements,courseId,studentId,topicId) : "inherit";
  const effective=effectiveArrangement(
    plan.assignmentArrangements,courseId,studentId,topicId,
    plan.sharedArrangements) as Arrangement|"Both";
  const specific=plan.assignmentArrangements.find(item=>
    item.courseId===courseId && item.studentId===studentId &&
    item.topicId===topicId);
  const selected:Choice=specific?.arrangement==="Later"
    ? "inherit" : specific?.arrangement??"inherit";
  const inherited=!specific;
  // No member has to make this choice. Historical "Later" entries are
  // presented as unset; clear/inherit removes them without a data migration.
  // Combined and Separate retain their full-strength symbols.
  const isUnset=effective==="Later";
  const caption=isUnset?"Not chosen yet":
    effective==="Both"?"Both (previous setting)":effective;
  function choose(value:Choice){
    if(value==="Both") return; // legacy read-only value
    const withoutThis=plan.assignmentArrangements.filter(item=>!(
      item.courseId===courseId && item.studentId===studentId && item.topicId===topicId));
    const inheritedValue=effectiveArrangement(withoutThis,courseId,studentId,topicId,
      plan.sharedArrangements);
    // Selecting a value equal to the inherited effective choice restores
    // inheritance instead of pinning a redundant student override.
    plan.setAssignmentArrangement(courseId,studentId,topicId,
      value==="inherit" || value===inheritedValue?null:value);
    onChanged?.();
    setOpen(false);
    triggerRef.current?.focus();
  }
  const choices:{value:Choice;label:string;display:Arrangement|"Both"|null}[]=[
    {value:"inherit",label:topicId?"Same as plan":"Same as everyone",display:base},
    {value:"Combined",label:"Combined",display:"Combined"},
    {value:"Separate",label:"Separate",display:"Separate"},
    ...(selected==="Both"?[{value:"Both" as Choice,label:"Both (previous setting)",display:"Both" as const}]:[]),
  ];
  return <div
      className={"student-arrangement-control"+(inherited?" is-inherited":"")+
        (isUnset?" is-unset":"")}
      onClick={event=>event.stopPropagation()}>
    <button type="button" ref={triggerRef} className="planning-icon-control student-arrangement-trigger"
      disabled={!plan.ready} aria-expanded={open} aria-controls={menuId}
      aria-label={studentName+": "+caption+" arrangement"+(inherited?" (same as course)":"")+". Change arrangement"}
      title={studentName+" · "+caption+" arrangement"+(inherited?" (same as course)":"")}
      onClick={()=>setOpen(v=>!v)}>
      {isUnset?<ArrangementPlaceholderSymbol size={19}/>:
        <ArrangementSymbol value={effective} size={19}/>}
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
          {item.value==="inherit" && isUnset?
            <ArrangementPlaceholderSymbol size={19}/>:
            item.display?<ArrangementSymbol value={item.display} size={19}/>:null}
        </span>
        <span>{item.label}</span>
        {selected===item.value && <Check size={14} aria-hidden="true"/>}
      </button>)}
    </FloatingChoiceMenu>
  </div>;
}
