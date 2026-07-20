import test from "node:test";
import assert from "node:assert/strict";

import {
  collectPublicAreaNameOptionsFromSelectedFeature,
  derivePublicAreaName,
  derivePublicAreaNameFromSelectedFeature,
  isInstitutionalPlaceLabel,
  isNoisyStreetLabel,
  stripLeadingHouseNumber,
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

test("stripLeadingHouseNumber removes common AU/UK/US house numbers", () => {
  assert.equal(
    stripLeadingHouseNumber("28 Great Russell Street"),
    "Great Russell Street"
  );
  assert.equal(stripLeadingHouseNumber("12A Smith Street"), "Smith Street");
  assert.equal(stripLeadingHouseNumber("221B Baker Street"), "Baker Street");
  assert.equal(stripLeadingHouseNumber("Unit 4 High Street"), "High Street");
  assert.equal(
    stripLeadingHouseNumber("Great Russell Street"),
    "Great Russell Street"
  );
});

test("isInstitutionalPlaceLabel catches campuses typed as place", () => {
  assert.equal(isInstitutionalPlaceLabel("University College London"), true);
  assert.equal(isInstitutionalPlaceLabel("London"), false);
  assert.equal(isInstitutionalPlaceLabel("Bloomsbury"), false);
});

test("isNoisyStreetLabel catches motorways and numbered routes", () => {
  assert.equal(isNoisyStreetLabel("Pacific Motorway"), true);
  assert.equal(isNoisyStreetLabel("A1079 Road (Great Britain)"), true);
  assert.equal(isNoisyStreetLabel("Great Russell Street"), false);
});

test("UK campus-adjacent address defaults to neighbourhood; campus remains an option", () => {
  // Near the British Museum / UCL — public landmarks, not private homes.
  const selected = feature({
    id: "address.great-russell-street",
    text: "28 Great Russell Street",
    place_name: "28 Great Russell Street, Bloomsbury, London, United Kingdom",
    place_type: ["address"],
    context: [
      feature({
        id: "neighbourhood.bloomsbury",
        text: "Bloomsbury",
      }),
      feature({
        id: "place.london",
        text: "London",
      }),
      feature({
        id: "country.gb",
        text: "United Kingdom",
      }),
    ],
  });

  const reverseFeatures = [
    feature({
      id: "poi.university-college-london",
      text: "University College London",
      place_name:
        "University College London, Bloomsbury, London, United Kingdom",
      place_type: ["poi"],
    }),
    feature({
      id: "neighbourhood.bloomsbury",
      text: "Bloomsbury",
    }),
    feature({
      id: "place.london",
      text: "London",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Bloomsbury"
  );
  assert.equal(derivePublicAreaName(reverseFeatures)?.name, "Bloomsbury");
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Bloomsbury", "London", "University College London"]
  );
});

test("UK campus typed as place is offered; default is ordinary city over campus", () => {
  const selected = feature({
    id: "address.great-russell-street",
    text: "28 Great Russell Street",
    place_name: "28 Great Russell Street, Bloomsbury, London, United Kingdom",
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

  const reverseFeatures = [
    feature({
      id: "place.university-college-london",
      text: "University College London",
      place_type: ["place"],
    }),
    feature({
      id: "place.london",
      text: "London",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures)?.name,
    "London"
  );

  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["London", "University College London"]
  );
});

test("campus-adjacent reverse offers city and university; never street or region", () => {
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
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures)?.name,
    "Bloomsbury"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Bloomsbury", "London", "University College London"]
  );
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
    collectPublicAreaNameOptionsFromSelectedFeature(selected).map(
      (option) => option.name
    ),
    []
  );
});

test("AU street address defaults to city when suburb is missing", () => {
  // Museum of Sydney — public civic address.
  const selected = feature({
    id: "address.macquarie-street",
    text: "37 Phillip Street",
    place_name: "37 Phillip Street, Sydney NSW, Australia",
    place_type: ["address"],
    context: [
      feature({
        id: "place.sydney",
        text: "Sydney",
      }),
      feature({
        id: "region.nsw",
        text: "New South Wales",
      }),
      feature({
        id: "country.au",
        text: "Australia",
      }),
    ],
  });

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Sydney"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(selected).map(
      (option) => option.name
    ),
    ["Sydney"]
  );
});

test("AU POI pick uses neighbourhood from context; roads are not options", () => {
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
    feature({
      id: "region.nsw",
      text: "New South Wales",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures)?.name,
    "Circular Quay"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Circular Quay", "Sydney", "Circular Quay Station"]
  );
});

test("US locality is preferred when neighbourhood is absent", () => {
  // Theodore Roosevelt Birthplace National Historic Site.
  const selected = feature({
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
      feature({
        id: "region.ny",
        text: "New York",
      }),
    ],
  });

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Flatiron District"
  );
});

test("NZ suburb neighbourhood wins over city", () => {
  // Te Papa / waterfront — public civic area.
  const selected = feature({
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
  });

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Te Aro"
  );
});

test("DE municipal_district is used when finer types are missing", () => {
  // Jewish Museum Berlin area — public landmark street.
  const selected = feature({
    id: "address.lindenstrasse",
    text: "9-14 Lindenstraße",
    place_name: "Lindenstraße 9-14, Berlin, Germany",
    place_type: ["address"],
    context: [
      feature({
        id: "municipal_district.friedrichshain-kreuzberg",
        text: "Friedrichshain-Kreuzberg",
      }),
      feature({
        id: "place.berlin",
        text: "Berlin",
      }),
    ],
  });

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Friedrichshain-Kreuzberg"
  );
});

test("ES city is default when only city context exists", () => {
  // Casa Vicens / Gaudí — public museum address in Gràcia.
  const selected = feature({
    id: "address.casa-vicens",
    text: "24 Carrer de les Carolines",
    place_name: "Carrer de les Carolines 24, Barcelona, Spain",
    place_type: ["address"],
    context: [
      feature({
        id: "place.barcelona",
        text: "Barcelona",
      }),
      feature({
        id: "country.es",
        text: "Spain",
      }),
    ],
  });

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Barcelona"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(selected).map(
      (option) => option.name
    ),
    ["Barcelona"]
  );
});

test("campus-only reverse can default to the campus when no city exists", () => {
  assert.equal(
    derivePublicAreaName([
      feature({
        id: "poi.university-college-london",
        text: "University College London",
        place_type: ["poi"],
      }),
    ])?.name,
    "University College London"
  );
});

test("institutional place-only reverse falls through to a non-campus place", () => {
  assert.equal(
    derivePublicAreaName([
      feature({
        id: "place.university-college-london",
        text: "University College London",
        place_type: ["place"],
      }),
      feature({
        id: "place.london",
        text: "London",
        place_type: ["place"],
      }),
    ])?.name,
    "London"
  );
});
