import test from "node:test";
import assert from "node:assert/strict";
import type { LngLatBounds } from "maplibre-gl";

import { approximateBoundsFromViewState, padBounds } from "./mapUtils.ts";

function bounds(
  south: number,
  west: number,
  north: number,
  east: number
): LngLatBounds {
  return {
    getSouthWest: () => ({ lat: south, lng: west }),
    getNorthEast: () => ({ lat: north, lng: east }),
  } as LngLatBounds;
}

test("padBounds splits full-world viewports into geography-safe boxes", () => {
  const boxes = padBounds(bounds(-90, -180, 90, 180), 0);

  assert.deepEqual(boxes, [
    { south: -89.999999, north: 89.999999, west: -180, east: -60 },
    { south: -89.999999, north: 89.999999, west: -60, east: 60 },
    { south: -89.999999, north: 89.999999, west: 60, east: 180 },
  ]);
});

test("padBounds still splits antimeridian crossings", () => {
  const boxes = padBounds(bounds(-10, 170, 10, 190), 0.3);

  assert.deepEqual(boxes, [
    { south: -16, north: 16, west: 164, east: 180 },
    { south: -16, north: 16, west: -180, east: -164 },
  ]);
});

test("approximateBoundsFromViewState centres on the saved map view", () => {
  const approximateBounds = approximateBoundsFromViewState(151.16, -33.91, 7);

  assert.ok(approximateBounds.contains([151.16, -33.91]));
  assert.ok(approximateBounds.getWest() < 151.16);
  assert.ok(approximateBounds.getEast() > 151.16);
  assert.ok(approximateBounds.getSouth() < -33.91);
  assert.ok(approximateBounds.getNorth() > -33.91);
});
