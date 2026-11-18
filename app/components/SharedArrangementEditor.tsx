"use client";

import { useId, useRef, useState } from "react";
import { Check, Layers3 } from "lucide-react";
import { useDemoPlan, type SharedArrangement } from "./DemoPlanContext";
import { effectiveArrangement, arrangementRollup, sharedCourseArrangement,
  sharedTopicArrangementOverride, sharedTopicArrangement,
  sharedArrangementSummary } from "./arrangement-inheritance.mjs";
import { isTopicAssigned } from "./topic-assignment.mjs";
import { ArrangementSymbol, ArrangementPlaceholderSymbol } from "./StudentArrangementControl";
import FloatingChoiceMenu from "./FloatingChoiceMenu";

type Arrangement="Combined"|"Separate"|"Later";
type Choice=Arrangement|"inherit"|"clear";
const options:Arrangement[]=["Combined","Separate","Later"];

/** One shared arrangement choice for every member of a course or topic,
 * automatically inherited unless the student has an explicit override. */
export default function SharedArrangementEditor({
  courseId,topicId=null,selectedTopicIds=[],compact=false,disabled=false,
}:{
  courseId:string;topicId?:string|null;selectedTopicIds?:string[];
  compact?:boolean;disabled?:boolean;
}){
  const plan=useDemoPlan();
  const [open,setOpen]=useState(false);
  const id=useId();
  const triggerRef=useRef<HTMLButtonElement>(null);
  const shared=plan.sharedArrangements;
  const choice=plan.courses.find(course=>course.courseId===courseId);
  const courseDefault=sharedCourseArrangement(shared,courseId);
  const explicitTopic=topicId===null?"inherit":
    sharedTopicArrangementOverride(shared,courseId,topicId);
  const defaults=topicId===null
    ? sharedArrangementSummary(shared,courseId,selectedTopicIds)
    : sharedTopicArrangement(shared,courseId,topicId);
  let shown:Arrangement|"Both"|"Varied"|null=defaults;
  if(choice){
    const topics=topicId===null?choice.topics.filter(t=>t.included):
      choice.topics.filter(t=>t.included&&t.topicId===topicId);
    const effective=topics.flatMap(t=>plan.students.filter(student=>
      isTopicAssigned(choice,t.topicId,student.id)).map(student=>
      effectiveArrangement(plan.assignmentArrangements,courseId,student.id,
        t.topicId,shared)));
    if(effective.length) shown=arrangementRollup(effective);
  }
  const inherited=topicId!==null&&explicitTopic==="inherit";
  const active=topicId===null?courseDefault??"clear":explicitTopic;
  const label=shown==="Varied"?"Varied arrangements":
    shown===null?"Set arrangement":shown==="Later"?"Decide later":shown==="Both"?
    "Both (previous setting)":shown;
  function choose(value:Choice) {
    const picked:SharedArrangement["arrangement"]|null=
      value==="inherit"||value==="clear"?null:value;
    const next=topicId!==null && picked===courseDefault?null:picked;
    if(!choice){
      if(topicId===null)plan.addChoice(courseId);
      else plan.toggleListIdea(courseId,topicId);
    }
    plan.setSharedArrangement(courseId,topicId,next);
    setOpen(false);
    triggerRef.current?.focus();
  }
  return <div className={"priority-control shared-arrangement-control"+
    (compact?" is-compact":"")+(shown&&shown!=="Later"?" has-priority":"")+
    (inherited?" is-inherited":"")+(shown===null?" is-unset":"")}
    onClick={event=>event.stopPropagation()}>
    <button ref={triggerRef} type="button" className="priority-control-trigger"
      disabled={disabled||!plan.ready} aria-expanded={open} aria-controls={id}
      aria-label={"Arrangement: "+label+(inherited?" (same as course)":"")}
      title={"Arrangement: "+label+(inherited?" (same as course)":"")}
      onClick={()=>setOpen(v=>!v)}>
      {shown===null?<ArrangementPlaceholderSymbol size={compact?17:19}/>:
        shown==="Varied"?<Layers3 size={compact?17:19} aria-hidden="true"/>:
        <ArrangementSymbol value={shown} size={compact?18:20}/>}
    </button>
    <FloatingChoiceMenu open={open} triggerRef={triggerRef}
      onDismiss={()=>setOpen(false)} id={id}
      label={topicId===null?"Course arrangement":"Topic arrangement"}>
      <div className="priority-control-heading">Arrangement <span>optional</span></div>
      {topicId!==null&&<button type="button" className="priority-option"
        aria-pressed={active==="inherit"} onClick={()=>choose("inherit")}>
        <ArrangementPlaceholderSymbol size={19}/>
        <span>Same as course</span>
        {active==="inherit"&&<Check size={14} aria-hidden="true"/>}
      </button>}
      {options.map(value=><button type="button" key={value}
        className="priority-option" aria-pressed={active===value}
        onClick={()=>choose(value)}>
        <ArrangementSymbol value={value} size={20}/>
        <span>{value==="Later"?"Decide later":value}</span>
        {active===value&&<Check size={14} aria-hidden="true"/>}
      </button>)}
      {topicId===null&&<button type="button" className="priority-option"
        aria-pressed={active==="clear"} onClick={()=>choose("clear")}>
        <ArrangementPlaceholderSymbol size={19}/>
        <span>Clear arrangement</span>
        {active==="clear"&&<Check size={14} aria-hidden="true"/>}
      </button>}
      {topicId===null&&selectedTopicIds.some(topic=>
        sharedTopicArrangementOverride(shared,courseId,topic)!=="inherit")&&
        <p className="priority-control-note">Topics you've changed keep their choices.</p>}
    </FloatingChoiceMenu>
  </div>;
}
