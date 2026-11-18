"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
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
  const [opensUp,setOpensUp]=useState(false);
  const [alignStart,setAlignStart]=useState(false);
  const menuRef=useRef<HTMLDivElement>(null);
  const rootRef=useRef<HTMLDivElement>(null);
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
  useEffect(()=>{
    if(!open) return;
    function closeOutside(event:PointerEvent){
      if(!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function closeEscape(event:KeyboardEvent){
      if(event.key==="Escape"){setOpen(false);triggerRef.current?.focus();}
    }
    document.addEventListener("pointerdown",closeOutside);
    document.addEventListener("keydown",closeEscape);
    return()=>{
      document.removeEventListener("pointerdown",closeOutside);
      document.removeEventListener("keydown",closeEscape);
    };
  },[open]);
  useLayoutEffect(()=>{
    if(!open || !triggerRef.current || !menuRef.current) return;
    const trigger=triggerRef.current.getBoundingClientRect();
    const menu=menuRef.current.getBoundingClientRect();
    const scroller=triggerRef.current.closest(
      ".pd-body, .pd-full-column-body, .cx-inline-assign");
    const bounds=scroller?.getBoundingClientRect();
    const top=Math.max(0,bounds?.top??0);
    const bottom=Math.min(window.innerHeight,bounds?.bottom??window.innerHeight);
    const left=Math.max(0,bounds?.left??0);
    const below=bottom-trigger.bottom;
    const above=trigger.top-top;
    setOpensUp(below < menu.height+8 && above>below);
    setAlignStart(trigger.right-menu.width < left+5);
  },[open]);
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
  return <div ref={rootRef}
      className={"student-arrangement-control"+(inherited?" is-inherited":"")+
        (opensUp?" is-flipped":"")+(alignStart?" is-align-start":"")}
      onClick={event=>event.stopPropagation()}>
    <button type="button" ref={triggerRef} className="student-arrangement-trigger"
      disabled={!plan.ready} aria-expanded={open} aria-controls={menuId}
      aria-label={studentName+": "+caption+" arrangement"+(inherited?" (same as course)":"")+". Change arrangement"}
      title={studentName+" · "+caption+" arrangement"+(inherited?" (same as course)":"")}
      onClick={()=>setOpen(v=>!v)}>
      <ArrangementSymbol value={effective} size={19}/>
    </button>
    {open && <div ref={menuRef} id={menuId} className="priority-control-popover student-arrangement-popover"
      role="group" aria-label={"Arrangement for "+studentName}>
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
    </div>}
  </div>;
}
