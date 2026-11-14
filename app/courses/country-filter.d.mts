export type CountryFilter = "all" | "us" | "canada";
export declare function matchesCountry(
  scope: string | null | undefined,
  country: CountryFilter,
): boolean;
