/** A quiet exception marker in topic student metadata. No dot is shown
 * when the student's effective priority matches the shared topic value. */
export default function StudentPriorityDot({
  studentName, priority,
}:{
  studentName:string;
  priority:"Core"|"High Interest"|"Additional"|null;
}){
  const tone=priority==="Core"?"core":priority==="High Interest"?"high":
    priority==="Additional"?"additional":"unset";
  const label=priority??"No priority";
  return <span className={"pd-student-priority-dot is-"+tone}
    role="img" aria-label={studentName+": "+label+" priority"}
    title={studentName+": "+label+" priority"} />;
}
