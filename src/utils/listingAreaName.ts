export type ListingAreaNameFeature = {
  id?: string;
  place_name?: string;
  place_type?: string[];
  properties?: {
    "osm:place_type"?: string;
  };
  text?: string;
  "osm:place_type"?: string;
  context?: ListingAreaNameFeature[];
};

/** Finer area labels preferred for “Resident of {area}”. */
const FINE_TYPES = ["neighbourhood", "locality", "municipal_district"] as const;

/** City-scale labels preferred after neighbourhood/locality. */
const CITY_TYPES = ["place", "municipality"] as const;

/**
 * MapTiler often types campuses/landmarks as `place` rather than `poi`.
 * Keep them as Change… options, but prefer ordinary neighbourhood/city defaults.
 */
const INSTITUTIONAL_PLACE_NAME_PATTERN =
  /\b(university|college|campus|hospital|airport|station|museum|stadium|shopping\s+centre|shopping\s+center)\b/i;

function featureMatchesAreaType(feature: ListingAreaNameFeature, type: string) {
  return (
    feature.place_type?.includes(type) ||
    feature.id?.startsWith(`${type}.`) ||
    feature.id?.startsWith(`${type}:`)
  );
}

function isInstitutionalPlaceLabel(name: string) {
  return INSTITUTIONAL_PLACE_NAME_PATTERN.test(name);
}

function featureLabel(feature: ListingAreaNameFeature) {
  return feature.text?.trim() || feature.place_name?.trim() || "";
}

function isUsableAreaCandidate(feature: ListingAreaNameFeature) {
  if (
    feature.properties?.["osm:place_type"] === "unknown" ||
    feature["osm:place_type"] === "unknown"
  ) {
    return false;
  }

  const name = featureLabel(feature);
  if (!name) {
    return false;
  }

  if (
    featureMatchesAreaType(feature, "region") ||
    featureMatchesAreaType(feature, "country") ||
    featureMatchesAreaType(feature, "continental_marine") ||
    featureMatchesAreaType(feature, "address") ||
    featureMatchesAreaType(feature, "road")
  ) {
    return false;
  }

  // Ordinary POIs are noise; campuses/landmarks can be Change… choices.
  if (
    featureMatchesAreaType(feature, "poi") &&
    !isInstitutionalPlaceLabel(name)
  ) {
    return false;
  }

  return true;
}

function pushUnique(names: string[], seen: Set<string>, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const key = trimmed.toLowerCase();
  if (seen.has(key)) return;

  seen.add(key);
  names.push(trimmed);
}

function featuresFromSelected(
  feature: ListingAreaNameFeature,
  extraFeatures: ListingAreaNameFeature[] = []
) {
  return [
    feature,
    ...((feature.context as ListingAreaNameFeature[] | undefined) ?? []),
    ...extraFeatures,
  ];
}

/**
 * Distinct public-label candidates from structured geocoder features only.
 * Order: fine → ordinary city/place → campuses. Never roads/regions/countries.
 */
export function collectPublicAreaNameOptions(
  features: ListingAreaNameFeature[]
): string[] {
  const candidates = features.filter(isUsableAreaCandidate);
  const result: string[] = [];
  const seen = new Set<string>();

  for (const type of FINE_TYPES) {
    for (const feature of candidates) {
      if (!featureMatchesAreaType(feature, type)) continue;
      pushUnique(result, seen, featureLabel(feature));
    }
  }

  for (const type of CITY_TYPES) {
    for (const feature of candidates) {
      if (!featureMatchesAreaType(feature, type)) continue;
      const name = featureLabel(feature);
      if (isInstitutionalPlaceLabel(name)) continue;
      pushUnique(result, seen, name);
    }
  }

  for (const type of CITY_TYPES) {
    for (const feature of candidates) {
      if (!featureMatchesAreaType(feature, type)) continue;
      const name = featureLabel(feature);
      if (!isInstitutionalPlaceLabel(name)) continue;
      pushUnique(result, seen, name);
    }
  }

  for (const feature of candidates) {
    if (!featureMatchesAreaType(feature, "poi")) continue;
    const name = featureLabel(feature);
    if (!isInstitutionalPlaceLabel(name)) continue;
    pushUnique(result, seen, name);
  }

  return result;
}

/** Default public listing area label (first collect option). */
export function derivePublicAreaName(
  features: ListingAreaNameFeature[]
): string | null {
  return collectPublicAreaNameOptions(features)[0] ?? null;
}

export function derivePublicAreaNameFromSelectedFeature(
  feature: ListingAreaNameFeature,
  extraFeatures: ListingAreaNameFeature[] = []
): string | null {
  return derivePublicAreaName(featuresFromSelected(feature, extraFeatures));
}

export function collectPublicAreaNameOptionsFromSelectedFeature(
  feature: ListingAreaNameFeature,
  extraFeatures: ListingAreaNameFeature[] = []
): string[] {
  return collectPublicAreaNameOptions(
    featuresFromSelected(feature, extraFeatures)
  );
}

export function getSelectedFeatureDisplayName(
  feature: ListingAreaNameFeature
): string {
  return feature.place_name?.trim() || feature.text?.trim() || "";
}
