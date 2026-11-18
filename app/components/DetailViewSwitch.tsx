"use client";

import { AlignJustify, ListTree, BookOpenText } from "lucide-react";

/** Three levels of disclosure in the Course List. Local row disclosure stays
 * independent, so a member can read just one course in greater detail. */
export type DetailMode = "compact" | "topics" | "detailed";
export default function DetailViewSwitch({
  value, onChange, label,
}: { value: DetailMode; onChange: (next: DetailMode) => void; label: string;
  singleOpen?: boolean }) {
  return <div className="pd-detail-switch" role="group" aria-label={label + " details display"}>
    <button type="button" className={value === "compact" ? "is-current" : ""}
      aria-pressed={value === "compact"} title={"Show just course titles in " + label}
      onClick={() => onChange("compact")}>
      <AlignJustify size={14} aria-hidden="true"/> Compact
    </button>
    <button type="button" className={value === "topics" ? "is-current" : ""}
      aria-pressed={value === "topics"} title={"Show topic rows without descriptions in " + label}
      onClick={() => onChange("topics")}>
      <ListTree size={14} aria-hidden="true"/> Expanded
    </button>
    <button type="button" className={value === "detailed" ? "is-current" : ""}
      aria-pressed={value === "detailed"} title={"Show all descriptions and tips in " + label}
      onClick={() => onChange("detailed")}>
      <BookOpenText size={14} aria-hidden="true"/> Detailed
    </button>
  </div>;
}
