import test from "node:test";
import assert from "node:assert/strict";

import {
  LISTING_COUNTRY_PLACEHOLDER,
  normaliseListingCountryCode,
} from "./listingCountry.ts";

test("normaliseListingCountryCode returns null for empty and placeholder values", () => {
  assert.equal(normaliseListingCountryCode(undefined), null);
  assert.equal(normaliseListingCountryCode(null), null);
  assert.equal(normaliseListingCountryCode(""), null);
  assert.equal(normaliseListingCountryCode("   "), null);
  assert.equal(normaliseListingCountryCode(LISTING_COUNTRY_PLACEHOLDER), null);
  assert.equal(normaliseListingCountryCode("INITIAL"), null);
});

test("normaliseListingCountryCode returns trimmed uppercase country codes", () => {
  assert.equal(normaliseListingCountryCode("GB"), "GB");
  assert.equal(normaliseListingCountryCode(" au "), "AU");
});
