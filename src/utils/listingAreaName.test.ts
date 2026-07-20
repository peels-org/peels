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
  assert.equal(stripLeadingHouseNumber("10 College Road"), "College Road");
  assert.equal(stripLeadingHouseNumber("12A Smith Street"), "Smith Street");
  assert.equal(stripLeadingHouseNumber("221B Baker Street"), "Baker Street");
  assert.equal(stripLeadingHouseNumber("Unit 4 High Street"), "High Street");
  assert.equal(stripLeadingHouseNumber("College Road"), "College Road");
});

test("isInstitutionalPlaceLabel catches campuses typed as place", () => {
  assert.equal(isInstitutionalPlaceLabel("University of Exampleton"), true);
  assert.equal(isInstitutionalPlaceLabel("Exampleton"), false);
  assert.equal(isInstitutionalPlaceLabel("Westfield"), false);
});

test("isNoisyStreetLabel catches motorways and numbered routes", () => {
  assert.equal(isNoisyStreetLabel("Pacific Motorway"), true);
  assert.equal(isNoisyStreetLabel("A1079 Road (Great Britain)"), true);
  assert.equal(isNoisyStreetLabel("College Road"), false);
});

test("UK campus-adjacent address defaults to neighbourhood; campus remains an option", () => {
  const selected = feature({
    id: "address.college-road",
    text: "10 College Road",
    place_name: "10 College Road, Exampleton, EX1 2AB, United Kingdom",
    place_type: ["address"],
    context: [
      feature({
        id: "neighbourhood.westfield",
        text: "Westfield",
      }),
      feature({
        id: "place.exampleton",
        text: "Exampleton",
      }),
      feature({
        id: "country.gb",
        text: "United Kingdom",
      }),
    ],
  });

  const reverseFeatures = [
    feature({
      id: "poi.university-of-exampleton",
      text: "University of Exampleton",
      place_name: "University of Exampleton, Exampleton, United Kingdom",
      place_type: ["poi"],
    }),
    feature({
      id: "neighbourhood.westfield",
      text: "Westfield",
    }),
    feature({
      id: "place.exampleton",
      text: "Exampleton",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Westfield"
  );
  assert.equal(derivePublicAreaName(reverseFeatures)?.name, "Westfield");
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Westfield", "Exampleton", "University of Exampleton"]
  );
});

test("UK campus typed as place is offered; default is ordinary city over campus", () => {
  const selected = feature({
    id: "address.college-road",
    text: "10 College Road",
    place_name: "10 College Road, Exampleton, EX1 2AB, United Kingdom",
    place_type: ["address"],
    context: [
      feature({
        id: "place.university-of-exampleton",
        text: "University of Exampleton",
        place_type: ["place"],
      }),
      feature({
        id: "place.exampleton",
        text: "Exampleton",
      }),
    ],
  });

  const reverseFeatures = [
    feature({
      id: "place.university-of-exampleton",
      text: "University of Exampleton",
      place_type: ["place"],
    }),
    feature({
      id: "place.exampleton",
      text: "Exampleton",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures)?.name,
    "Exampleton"
  );

  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Exampleton", "University of Exampleton"]
  );
});

test("campus-adjacent reverse offers city and university; never street or region", () => {
  const selected = feature({
    id: "address.college-road",
    text: "10 College Road",
    place_name: "10 College Road, Exampleton, EX1 2AB, United Kingdom",
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
      id: "neighbourhood.westfield",
      text: "Westfield",
    }),
    feature({
      id: "place.exampleton",
      text: "Exampleton",
      place_type: ["place"],
    }),
    feature({
      id: "place.university-of-exampleton",
      text: "University of Exampleton",
      place_type: ["place"],
    }),
    feature({
      id: "road.ring-motorway",
      text: "Ring Motorway",
      place_type: ["road"],
    }),
    feature({
      id: "region.england",
      text: "England",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures)?.name,
    "Westfield"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Westfield", "Exampleton", "University of Exampleton"]
  );
});

test("street-only context with no area features yields no public label", () => {
  const selected = feature({
    id: "address.college-road",
    text: "10 College Road",
    place_name: "10 College Road, Exampleton, EX1 2AB, United Kingdom",
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
  const selected = feature({
    id: "address.darlinghurst",
    text: "42 Oxford Street",
    place_name: "42 Oxford Street, Darlinghurst NSW, Australia",
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
    id: "poi.riverside-station",
    text: "Riverside Station",
    place_name: "Riverside Station, Riverside, Sydney, Australia",
    place_type: ["poi"],
    context: [
      feature({
        id: "neighbourhood.riverside",
        text: "Riverside",
      }),
      feature({
        id: "place.sydney",
        text: "Sydney",
      }),
    ],
  });

  const reverseFeatures = [
    feature({
      id: "road.ring-motorway",
      text: "Ring Motorway",
      place_type: ["road"],
    }),
    feature({
      id: "region.nsw",
      text: "New South Wales",
    }),
  ];

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected, reverseFeatures)?.name,
    "Riverside"
  );
  assert.deepEqual(
    collectPublicAreaNameOptionsFromSelectedFeature(
      selected,
      reverseFeatures
    ).map((option) => option.name),
    ["Riverside", "Sydney", "Riverside Station"]
  );
});

test("US locality is preferred when neighbourhood is absent", () => {
  const selected = feature({
    id: "address.mission",
    text: "123 Valencia Street",
    place_name: "123 Valencia Street, San Francisco, California, United States",
    place_type: ["address"],
    context: [
      feature({
        id: "locality.mission-district",
        text: "Mission District",
      }),
      feature({
        id: "place.san-francisco",
        text: "San Francisco",
      }),
      feature({
        id: "region.ca",
        text: "California",
      }),
    ],
  });

  assert.equal(
    derivePublicAreaNameFromSelectedFeature(selected)?.name,
    "Mission District"
  );
});

test("NZ suburb neighbourhood wins over city", () => {
  const selected = feature({
    id: "address.te-aro",
    text: "5 Cuba Street",
    place_name: "5 Cuba Street, Te Aro, Wellington, New Zealand",
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
  const selected = feature({
    id: "address.kreuzberg",
    text: "10 Bergmannstraße",
    place_name: "Bergmannstraße 10, Berlin, Germany",
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
  const selected = feature({
    id: "address.gracia",
    text: "8 Carrer de Verdi",
    place_name: "Carrer de Verdi 8, Barcelona, Spain",
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
        id: "poi.university-of-exampleton",
        text: "University of Exampleton",
        place_type: ["poi"],
      }),
    ])?.name,
    "University of Exampleton"
  );
});

test("institutional place-only reverse falls through to a non-campus place", () => {
  assert.equal(
    derivePublicAreaName([
      feature({
        id: "place.university-of-exampleton",
        text: "University of Exampleton",
        place_type: ["place"],
      }),
      feature({
        id: "place.exampleton",
        text: "Exampleton",
        place_type: ["place"],
      }),
    ])?.name,
    "Exampleton"
  );
});
