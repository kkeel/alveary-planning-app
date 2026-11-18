"use client";

import { useDemoPlan } from "./DemoPlanContext";
import { sharedCoursePriority, sharedCourseSummary, sharedTopicOverride,
  sharedTopicPriority } from "./shared-priority.mjs";

/** Same lightweight priority editor is available in Think Tank, My Plan and
 * in-place student assignment. It never selects or assigns students. */
export default function SharedPriorityEditor({
  courseId, topicId = null, selectedTopicIds = [], compact = false,
}: {
  courseId: string;
  topicId?: string | null;
  selectedTopicIds?: string[];
  compact?: boolean;
}) {
  const plan = useDemoPlan();
  const shared = plan.sharedPriorities;
  const courseDefault = sharedCoursePriority(shared, courseId);
  const summary = topicId === null
    ? sharedCourseSummary(shared,courseId,selectedTopicIds)
    : sharedTopicPriority(shared,courseId,topicId);
  const override = topicId === null ? courseDefault :
    sharedTopicOverride(shared,courseId,topicId);
  const value = topicId === null ? courseDefault ?? "" :
    override === "inherit" ? "inherit" : override === "Not set" ? "none" : override;
  const choices = [
    ...(topicId !== null ? [{
      value:"inherit",
      label:"Use course default" + (courseDefault ? " (" + courseDefault + ")" : ""),
    }] : [{ value:"", label:"Decide later" }]),
    { value:"Core", label:"Core" },
    { value:"High Interest", label:"High Interest" },
    { value:"Additional", label:"Additional" },
    ...(topicId !== null ? [{ value:"none", label:"No priority" }] : []),
  ];
  const label = topicId === null ? "Course priority default" : "Topic priority";
  return <div className={"shared-priority-editor" +
    (compact ? " is-compact" : "")} onClick={event => event.stopPropagation()}>
    <label>
      <span>{label}</span>
      <select aria-label={label} value={value}
        disabled={!plan.ready}
        onChange={event => {
          const v = event.target.value;
          plan.setSharedPriority(courseId,topicId,
            v === "" || v === "inherit" ? null :
              v === "none" ? "Not set" :
              v as "Core" | "High Interest" | "Additional");
        }}>
        {choices.map(choice=><option key={choice.value} value={choice.value}>
          {choice.label}
        </option>)}
      </select>
    </label>
    {topicId === null && selectedTopicIds.length > 0 &&
      <small className="shared-priority-summary" aria-live="polite">
        {summary === "Varied"
          ? "Varied topics · customized topics stay unchanged"
          : summary ? "Selected topics: " + summary : "No selected priority yet"}
      </small>}
  </div>;
}
