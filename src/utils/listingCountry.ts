/** Placeholder select value; never persist this as a country code. */
export const LISTING_COUNTRY_PLACEHOLDER = "initial";

export function normaliseListingCountryCode(
  countryCode: string | null | undefined
): string | null {
  const trimmed = countryCode?.trim() ?? "";

  if (
    !trimmed ||
    trimmed.toLowerCase() === LISTING_COUNTRY_PLACEHOLDER.toLowerCase()
  ) {
    return null;
  }

  return trimmed.toUpperCase();
}
