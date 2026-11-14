/**
 * Country eligibility for the member-facing 2027–28 Course List.
 * "Both" always appears when either U.S. or Canada is chosen.
 * Country selection never alters the source curriculum or Plan Sort.
 * @param {string | null | undefined} scope
 * @param {"all" | "us" | "canada"} country
 */
export function matchesCountry(scope, country) {
  if (country === "all") return true;
  if (scope === "Both") return true;
  if (country === "us") return scope === "U.S.";
  return scope === "Canada";
}
