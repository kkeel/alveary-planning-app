/** Explicit website-facing catalog URLs never require planner sign-in.
 * Normal /courses and /books routes retain their independent member context. */
export const publicCatalogPaths = ["/public/courses", "/public/books"] as const;

export function isPublicCatalogPath(pathname: string): boolean {
  return publicCatalogPaths.includes(
    pathname.replace(/\/$/, "") as typeof publicCatalogPaths[number]
  );
}
