/** Placeholder select value; never persist this as a country code. */
export const LISTING_COUNTRY_PLACEHOLDER = "initial";

export function normaliseListingCountryCode(
  countryCode: string | null | undefined
): string | null {
  const trimmed = countryCode?.trim() ?? "";

  if (!trimmed || trimmed === LISTING_COUNTRY_PLACEHOLDER) {
    return null;
  }

  return trimmed;
}
