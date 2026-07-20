import test from "node:test";
import assert from "node:assert/strict";

import {
  collectPublicAreaNameOptionsFromSelectedFeature,
  derivePublicAreaName,
  derivePublicAreaNameFromSelectedFeature,
  type ListingAreaNameFeature,
} from "./listingAreaName.ts";

function feature(
  partial: ListingAreaNameFeature & { id: string; text: string }
): ListingAreaNameFeature {
  const typeFromId = partial.id.split(/[.:]/)[0];
  return {
    place_type: partial.place_type ?? [typeFromId],
    place_name: partial.place_name ?? partial.text,
    ...partial,
  };
}

test("defaults to neighbourhood; offers city and campus; never street or region", () => {
  const selected = feature({
    id: "address.great-russell-street",
    text: "28 Great Russell Street",
    place_name: "28 Great Russell Street, Bloomsbury, London, United Kingdom",
    place_type: ["address"],
    context: [
      feature({
        id: "region.england",
        text: "England",
      }),
      feature({
        id: "country.gb",
        text: "United Kingdom",
      }),
    ],
  });

  const reverseFeatures = [
    feature({
      id: "neighbourhood.bloomsbury",
      text: "Bloomsbury",
    }),
    feature({
      id: "place.london",
      text: "London",
      place_type: ["place"],
    }),
    feature({
      id: "place.university-college-london",
      text: "University College London",
      place_type: ["place"],
    }),
    feature({
      id: "road.pacific-motorway",
      text: "Pacific Motorway",
      place_type: ["road"],
    }),
    feature({
      id: "region.england",
      text: "England",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures),
    "Bloomsbury"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(selected, reverseFeatures),
    ["Bloomsbury", "London", "University College London"]
  );
});

test("prefers ordinary city over campus typed as place", () => {
  const selected = feature({
    id: "address.great-russell-street",
    text: "28 Great Russell Street",
    place_name: "28 Great Russell Street, London, United Kingdom",
    place_type: ["address"],
    context: [
      feature({
        id: "place.university-college-london",
        text: "University College London",
        place_type: ["place"],
      }),
      feature({
        id: "place.london",
        text: "London",
      }),
    ],
  });

  assert.equal(derivePublicAreaNameFromSelectedFeature(selected), "London");
  assert.deepEqual(collectPublicAreaNameOptionsFromSelectedFeature(selected), [
    "London",
    "University College London",
  ]);
});

test("street-only context with no area features yields no public label", () => {
  const selected = feature({
    id: "address.great-russell-street",
    text: "28 Great Russell Street",
    place_name: "28 Great Russell Street, London, United Kingdom",
    place_type: ["address"],
    context: [
      feature({
        id: "region.england",
        text: "England",
      }),
      feature({
        id: "country.gb",
        text: "United Kingdom",
      }),
    ],
  });

  assert.equal(derivePublicAreaNameFromSelectedFeature(selected), null);
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(selected),
    []
  );
});

test("AU POI uses neighbourhood from context; roads are not options", () => {
  const selected = feature({
    id: "poi.circular-quay-station",
    text: "Circular Quay Station",
    place_name: "Circular Quay Station, Circular Quay, Sydney, Australia",
    place_type: ["poi"],
    context: [
      feature({
        id: "neighbourhood.circular-quay",
        text: "Circular Quay",
      }),
      feature({
        id: "place.sydney",
        text: "Sydney",
      }),
    ],
  });

  const reverseFeatures = [
    feature({
      id: "road.pacific-motorway",
      text: "Pacific Motorway",
      place_type: ["road"],
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures),
    "Circular Quay"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(selected, reverseFeatures),
    ["Circular Quay", "Sydney", "Circular Quay Station"]
  );
});

test("US locality and NZ neighbourhood are accepted fine types", () => {
  assert.equal(
    derivePublicAreaNameFromSelectedFeature(
      feature({
        id: "address.roosevelt-birthplace",
        text: "28 E 20th Street",
        place_name: "28 E 20th Street, New York, New York, United States",
        place_type: ["address"],
        context: [
          feature({
            id: "locality.flatiron-district",
            text: "Flatiron District",
          }),
          feature({
            id: "place.new-york",
            text: "New York",
          }),
        ],
      })
    ),
    "Flatiron District"
  );

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(
      feature({
        id: "address.cable-street",
        text: "55 Cable Street",
        place_name: "55 Cable Street, Te Aro, Wellington, New Zealand",
        place_type: ["address"],
        context: [
          feature({
            id: "neighbourhood.te-aro",
            text: "Te Aro",
          }),
          feature({
            id: "place.wellington",
            text: "Wellington",
          }),
        ],
      })
    ),
    "Te Aro"
  );
});

test("campus-only reverse can default to the campus", () => {
  assert.equal(
    derivePublicAreaName([
      feature({
        id: "poi.university-college-london",
        text: "University College London",
        place_type: ["poi"],
      }),
    ]),
    "University College London"
  );
});
