"use client";

import { AlignJustify, ListTree } from "lucide-react";

/** A small, consistent view choice across catalog and planning workspaces.
 * The setting controls initial row disclosure; individual titles can still
 * be opened or closed without changing the entire column. */
export type DetailMode = "expanded" | "compact";
export default function DetailViewSwitch({
  value, onChange, label,
}: { value: DetailMode; onChange: (next: DetailMode) => void; label: string }) {
  return <div className="pd-detail-switch" role="group" aria-label={label + " details display"}>
    <button type="button" className={value === "expanded" ? "is-current" : ""}
      aria-pressed={value === "expanded"} title={"Expand all " + label + " entries"}
      onClick={() => onChange("expanded")}>
      <ListTree size={14} aria-hidden="true"/> Expanded
    </button>
    <button type="button" className={value === "compact" ? "is-current" : ""}
      aria-pressed={value === "compact"} title={"Show a compact " + label + " list"}
      onClick={() => onChange("compact")}>
      <AlignJustify size={14} aria-hidden="true"/> Compact
    </button>
  </div>;
}
