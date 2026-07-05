import type { LngLatBounds } from "maplibre-gl";

import {
  isListingError,
  type Listing,
  type ListingCoordinates,
  type ListingMarker,
  type SelectedListing,
} from "../../../types/listing.ts";

export type BoundingBox = {
  south: number;
  west: number;
  north: number;
  east: number;
};

const GEOGRAPHY_BOUND_EPSILON = 0.000001;
const GLOBAL_LONGITUDE_SLICES = [-180, -60, 60, 180] as const;

export const ZOOM_LEVEL_DEFAULT = 11;
export const ZOOM_LEVEL_SELECTED = 14;
export const MAP_MAX_ZOOM = 15;

// Durations (ms) for the different fly-to flows
export const FLY_DURATION = {
  jump: 0,
  urlSelection: 900,
  returnToListing: 1500,
  searchPick: 3200,
} as const;

// Shared sidebar width used by both the desktop layout and the map padding
// calculations so the map always accounts for the covered viewport area.
export const SIDEBAR_WIDTH = "clamp(20rem, 30vw, 30rem)";

// Snap points for the mobile listing drawer. 0.35 gives enough room for the
// listing header/CTA while keeping the map visible; 1 is the fully expanded
// state.
export const SNAP_POINTS = {
  partial: 0.35,
  full: 1,
} as const;

// `Listing` and `ListingMarker` both carry a nullable `coordinates` field.
// `SelectedListing` can additionally be a `ListingError` sentinel, which has
// no coordinates. Narrowing explicitly here (rather than treating anything
// without `error === true` as a listing) keeps the intent readable.
type CoordinateBearing = Listing | ListingMarker;

function hasCoordinateField(
  listing: CoordinateBearing | SelectedListing | null | undefined
): listing is CoordinateBearing {
  if (!listing) return false;
  if (isListingError(listing as SelectedListing)) return false;
  return "coordinates" in listing;
}

export function getListingCoordinates(
  listing: CoordinateBearing | SelectedListing | null | undefined
): ListingCoordinates | null {
  if (!hasCoordinateField(listing)) return null;
  return listing.coordinates ?? null;
}

export function hasValidCoordinates(
  listing: CoordinateBearing | SelectedListing | null | undefined
): listing is CoordinateBearing & { coordinates: ListingCoordinates } {
  const coordinates = getListingCoordinates(listing);
  return Boolean(
    coordinates &&
    typeof coordinates.latitude === "number" &&
    typeof coordinates.longitude === "number" &&
    Number.isFinite(coordinates.latitude) &&
    Number.isFinite(coordinates.longitude)
  );
}

// Wrap a longitude into the canonical [-180, 180] range. MapLibre reports
// bounds as "unwrapped" coordinates (values outside the canonical range when
// the user has panned across the antimeridian), but the `listings_in_view`
// RPC feeds them into PostGIS' `st_makeenvelope`, which expects canonical
// longitudes.
export function wrapLongitude(lng: number): number {
  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

const DEFAULT_MAP_VIEWPORT_WIDTH = 1280;
const DEFAULT_MAP_VIEWPORT_HEIGHT = 900;

function createBounds(
  west: number,
  south: number,
  east: number,
  north: number
): LngLatBounds {
  return {
    getSouthWest: () => ({ lat: south, lng: west }),
    getNorthEast: () => ({ lat: north, lng: east }),
    getCenter: () => ({
      lng: wrapLongitude((west + east) / 2),
      lat: (south + north) / 2,
    }),
    contains: (coordinate) => {
      const lng = Array.isArray(coordinate)
        ? coordinate[0]
        : "lng" in coordinate
          ? coordinate.lng
          : coordinate.lon;
      const lat = Array.isArray(coordinate) ? coordinate[1] : coordinate.lat;

      return lat >= south && lat <= north && lng >= west && lng <= east;
    },
    getWest: () => west,
    getEast: () => east,
    getSouth: () => south,
    getNorth: () => north,
  } as LngLatBounds;
}

// Approximate the current viewport bounds from a saved map view before MapLibre
// has finished loading. Search can use these immediately and refine them on idle.
export function approximateBoundsFromViewState(
  longitude: number,
  latitude: number,
  zoom: number,
  width = DEFAULT_MAP_VIEWPORT_WIDTH,
  height = DEFAULT_MAP_VIEWPORT_HEIGHT
): LngLatBounds {
  const scale = 512 * 2 ** zoom;
  const lngDelta = (360 / scale) * (width / 2);
  const latRad = (latitude * Math.PI) / 180;
  const latDelta =
    ((360 / scale) * (height / 2)) / Math.max(Math.cos(latRad), 0.01);

  const south = Math.max(-90, latitude - latDelta);
  const north = Math.min(90, latitude + latDelta);
  const west = wrapLongitude(longitude - lngDelta);
  const east = wrapLongitude(longitude + lngDelta);

  return createBounds(west, south, east, north);
}

// Expand a viewport bbox by a fraction (e.g. 0.3 => 30% larger in each
// direction). This lets us fetch a slightly padded area so that small pans
// reuse already-loaded pins without hitting the network again.
//
// Returns one or more boxes. Two are returned when the padded viewport crosses
// the antimeridian (e.g. Fiji, NZ → Alaska), and global viewports are split
// into geography-safe slices. Callers should fetch each box and merge results.
export function padBounds(bounds: LngLatBounds, factor = 0.3): BoundingBox[] {
  const sw = bounds.getSouthWest();
  const ne = bounds.getNorthEast();

  const latSpan = ne.lat - sw.lat;
  const lngSpan = ne.lng - sw.lng;

  const latPad = latSpan * factor;
  const lngPad = lngSpan * factor;

  const south = Math.max(-90 + GEOGRAPHY_BOUND_EPSILON, sw.lat - latPad);
  const north = Math.min(90 - GEOGRAPHY_BOUND_EPSILON, ne.lat + latPad);

  // If the padded viewport already covers the whole globe, just request the
  // world as multiple geography-safe slices. A single `-180..180` envelope can
  // create antipodal edges when PostGIS casts it to geography.
  if (lngSpan + 2 * lngPad >= 360) {
    return GLOBAL_LONGITUDE_SLICES.slice(0, -1).map((west, index) => ({
      south,
      north,
      west,
      east: GLOBAL_LONGITUDE_SLICES[index + 1],
    }));
  }

  const west = wrapLongitude(sw.lng - lngPad);
  const east = wrapLongitude(ne.lng + lngPad);

  if (west <= east) {
    return [{ south, north, west, east }];
  }

  // Crosses the antimeridian — split into two valid envelopes.
  return [
    { south, north, west, east: 180 },
    { south, north, west: -180, east },
  ];
}

export function isCoordinateInBounds(
  bounds: LngLatBounds,
  coordinates: ListingCoordinates
): boolean {
  return bounds.contains([coordinates.longitude, coordinates.latitude]);
}
