"use client";

import { useEffect } from "react";
import { Check, CircleAlert, LoaderCircle, Cloud } from "lucide-react";
import { usePlannerAuth } from "./PlannerAuthProvider";
import { useDemoPlan } from "./DemoPlanContext";

/** The DemoPlanProvider is mounted above the entire app shell: a queued save
 * stays visible through internal navigation, including List, Planning,
 * Students and the other planning pages. The indication never blocks edits. */
export default function AppSaveStatus() {
  const { status } = usePlannerAuth();
  const { saving, ready, error } = useDemoPlan();
  const signedIn = status === "signed-in";

  // Internal page switches keep the provider and pending queue alive. When
  // leaving the website entirely, let the browser warn about pending writes.
  useEffect(() => {
    if (!signedIn || !saving) return;
    function beforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [signedIn, saving]);

  if (!signedIn) return null;
  const state = error ? "error" : saving ? "saving" : ready ? "saved" : "connecting";
  const label = state === "error" ? "Not saved" :
    state === "saving" ? "Saving…" :
    state === "saved" ? "Saved" : "Connecting…";
  return <span className={"shell-save-status is-" + state}
    role={state === "error" ? "alert" : "status"}
    aria-live="polite" aria-atomic="true"
    title={error || (saving
      ? "Your latest changes are being saved. You can continue planning."
      : ready ? "Your saved planning changes are up to date."
      : "Connecting to your saved plan.")}>
    {state === "error" ? <CircleAlert size={15} aria-hidden="true"/> :
      state === "saving" ? <LoaderCircle className="shell-save-spinner" size={15} aria-hidden="true"/> :
        state === "saved" ? <Check size={15} aria-hidden="true"/> :
          <Cloud size={15} aria-hidden="true"/>}
    <span>{label}</span>
  </span>;
}
