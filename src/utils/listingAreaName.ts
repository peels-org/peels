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

export type ListingAreaNameMatch = {
  name: string;
  priority: number;
};

export type PublicAreaNameKind =
  | "neighbourhood"
  | "locality"
  | "municipal_district"
  | "place"
  | "municipality"
  | "poi";

export type PublicAreaNameOption = {
  name: string;
  kind: PublicAreaNameKind;
};

/** Finer area labels preferred for “Resident of {area}”. */
export const LISTING_AREA_NAME_FINE_TYPES = [
  "neighbourhood",
  "locality",
  "municipal_district",
] as const;

/** City-scale labels preferred after neighbourhood/locality. */
export const LISTING_AREA_NAME_CITY_TYPES = ["place", "municipality"] as const;

export const LISTING_AREA_NAME_TYPE_PRIORITY = [
  ...LISTING_AREA_NAME_FINE_TYPES,
  ...LISTING_AREA_NAME_CITY_TYPES,
] as const;

export type ListingAreaNameType =
  (typeof LISTING_AREA_NAME_TYPE_PRIORITY)[number];

const STREET_FEATURE_TYPES = new Set(["address", "road"]);

/**
 * MapTiler often types campuses/landmarks as `place` rather than `poi`
 * (e.g. “University of Exampleton”). Keep them as Change… options, but prefer
 * ordinary neighbourhood/city labels as the default.
 */
const INSTITUTIONAL_PLACE_NAME_PATTERN =
  /\b(university|college|campus|hospital|airport|station|museum|stadium|shopping\s+centre|shopping\s+center)\b/i;

/** Leading house / unit numbers common in AU, UK, US, NZ, etc. */
const LEADING_HOUSE_NUMBER_PATTERN =
  /^(?:(?:unit|apt|apartment|flat|suite|ste)\s+)?[\d]+[a-z]?(?:\s*[-/]\s*[\d]+[a-z]?)?\s+/i;

/**
 * Motorways / numbered routes / geocoder “Road (Great Britain)” labels.
 * Kept for tests / callers that want to recognise noisy road names.
 */
const NOISY_STREET_LABEL_PATTERN =
  /\b(motorway|freeway|highway|autobahn|autoroute|ring road|bypass)\b|\([^)]*\)|(?:^|\s)[AM]\d{1,4}\b/i;

export function featureMatchesAreaType(
  feature: ListingAreaNameFeature,
  type: string
) {
  return (
    feature.place_type?.includes(type) ||
    feature.id?.startsWith(`${type}.`) ||
    feature.id?.startsWith(`${type}:`)
  );
}

export function isPoiFeature(feature: ListingAreaNameFeature) {
  return featureMatchesAreaType(feature, "poi");
}

export function isUnknownOsmPlace(feature: ListingAreaNameFeature) {
  return (
    feature.properties?.["osm:place_type"] === "unknown" ||
    feature["osm:place_type"] === "unknown"
  );
}

export function isStreetFeature(feature: ListingAreaNameFeature) {
  return [...STREET_FEATURE_TYPES].some((type) =>
    featureMatchesAreaType(feature, type)
  );
}

export function isInstitutionalPlaceLabel(name: string) {
  return INSTITUTIONAL_PLACE_NAME_PATTERN.test(name);
}

export function isNoisyStreetLabel(name: string) {
  return NOISY_STREET_LABEL_PATTERN.test(name);
}

export function stripLeadingHouseNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  const stripped = trimmed.replace(LEADING_HOUSE_NUMBER_PATTERN, "").trim();
  return stripped || trimmed;
}

function featureLabel(feature: ListingAreaNameFeature) {
  return feature.text?.trim() || feature.place_name?.trim() || "";
}

function isUsableAreaCandidate(feature: ListingAreaNameFeature) {
  if (isUnknownOsmPlace(feature)) {
    return false;
  }

  const name = featureLabel(feature);
  if (!name) {
    return false;
  }

  // Region/country are never useful public listing labels.
  if (
    featureMatchesAreaType(feature, "region") ||
    featureMatchesAreaType(feature, "country") ||
    featureMatchesAreaType(feature, "continental_marine")
  ) {
    return false;
  }

  // Nearby roads from reverse geocode are never public labels.
  if (isStreetFeature(feature)) {
    return false;
  }

  // Ordinary POIs (cafes, shops) are noise; campuses/landmarks can be choices.
  if (isPoiFeature(feature) && !isInstitutionalPlaceLabel(name)) {
    return false;
  }

  return true;
}

function normaliseOptionKey(name: string) {
  return name.trim().toLocaleLowerCase();
}

function pushUniqueOption(
  options: PublicAreaNameOption[],
  seen: Set<string>,
  name: string,
  kind: PublicAreaNameKind
) {
  const trimmed = name.trim();
  if (!trimmed) return;

  const key = normaliseOptionKey(trimmed);
  if (seen.has(key)) return;

  seen.add(key);
  options.push({ name: trimmed, kind });
}

/**
 * Collect distinct public-label candidates from structured geocoder features
 * only (no place_name string parsing, no street names).
 *
 * Order: fine → ordinary city/place → campuses.
 * Region, country, roads, and streets are never offered — poor “Resident of …”
 * labels and awkward for city-level indexes later.
 */
export function collectPublicAreaNameOptions(
  features: ListingAreaNameFeature[],
  _options: { selectedFeature?: ListingAreaNameFeature | null } = {}
): PublicAreaNameOption[] {
  const candidates = features.filter(isUsableAreaCandidate);
  const result: PublicAreaNameOption[] = [];
  const seen = new Set<string>();

  for (const type of LISTING_AREA_NAME_FINE_TYPES) {
    for (const feature of candidates) {
      if (!featureMatchesAreaType(feature, type)) continue;
      pushUniqueOption(result, seen, featureLabel(feature), type);
    }
  }

  for (const type of LISTING_AREA_NAME_CITY_TYPES) {
    for (const feature of candidates) {
      if (!featureMatchesAreaType(feature, type)) continue;
      const name = featureLabel(feature);
      if (isInstitutionalPlaceLabel(name)) continue;
      pushUniqueOption(result, seen, name, type);
    }
  }

  for (const type of LISTING_AREA_NAME_CITY_TYPES) {
    for (const feature of candidates) {
      if (!featureMatchesAreaType(feature, type)) continue;
      const name = featureLabel(feature);
      if (!isInstitutionalPlaceLabel(name)) continue;
      pushUniqueOption(result, seen, name, type);
    }
  }

  for (const feature of candidates) {
    if (!isPoiFeature(feature)) continue;
    const name = featureLabel(feature);
    if (!isInstitutionalPlaceLabel(name)) continue;
    pushUniqueOption(result, seen, name, "poi");
  }

  return result;
}

/**
 * Derive the default public listing area label.
 * Prefers ordinary neighbourhood/city labels over campuses/landmarks.
 */
export function derivePublicAreaName(
  features: ListingAreaNameFeature[],
  options: { selectedFeature?: ListingAreaNameFeature | null } = {}
): ListingAreaNameMatch | null {
  const areaOptions = collectPublicAreaNameOptions(features, options);
  const preferred =
    areaOptions.find((option) => !isInstitutionalPlaceLabel(option.name)) ??
    areaOptions[0];

  if (!preferred) {
    return null;
  }

  return {
    name: preferred.name,
    priority: 0,
  };
}

export function derivePublicAreaNameFromSelectedFeature(
  feature: ListingAreaNameFeature,
  extraFeatures: ListingAreaNameFeature[] = []
): ListingAreaNameMatch | null {
  return derivePublicAreaName(
    [
      feature,
      ...((feature.context as ListingAreaNameFeature[] | undefined) ?? []),
      ...extraFeatures,
    ],
    { selectedFeature: feature }
  );
}

export function collectPublicAreaNameOptionsFromSelectedFeature(
  feature: ListingAreaNameFeature,
  extraFeatures: ListingAreaNameFeature[] = []
): PublicAreaNameOption[] {
  return collectPublicAreaNameOptions(
    [
      feature,
      ...((feature.context as ListingAreaNameFeature[] | undefined) ?? []),
      ...extraFeatures,
    ],
    { selectedFeature: feature }
  );
}

export function getSelectedFeatureDisplayName(
  feature: ListingAreaNameFeature
): string {
  return feature.place_name?.trim() || feature.text?.trim() || "";
}
