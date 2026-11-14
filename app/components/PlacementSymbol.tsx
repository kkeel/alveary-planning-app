/** Alveary's overlapping-circles placement guidance symbol.
 * Shared by Course List and the Planning Desk so hints look consistent. */
export default function PlacementSymbol({ size = 22 }: { size?: number }) {
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false">
    <circle cx="9" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
    <circle cx="15" cy="12" r="4" fill="none" stroke="currentColor" strokeWidth="1.7" />
  </svg>;
}
