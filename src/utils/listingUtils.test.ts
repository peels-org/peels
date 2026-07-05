import test from "node:test";
import assert from "node:assert/strict";

import {
  generateListingDescription,
  generateListingJsonLd,
  generateListingMetadata,
  getAnonymousSensitiveListingTeaser,
  getListingAvatar,
} from "./listingUtils.ts";
import { createPeelsMetadata } from "./seo.ts";
import type { Listing } from "../types/listing.ts";
import type { ListingSeoCopy } from "./listingUtils.ts";

const communityListing = {
  id: 1,
  name: "Neighbourhood compost drop-off",
  description:
    "Households can subscribe to drop off their food scraps at a local community hub.",
  accepted_items: ["Food scraps"],
  rejected_items: ["Meat and dairy"],
  photos: ["demo/community-garden.jpg"],
  links: [],
  type: "community",
  avatar: "demo/community-avatar.jpg",
  slug: "test-community-compost",
  coordinates: {
    latitude: -33.911,
    longitude: 151.1569,
  },
  country_code: "AU",
  area_name: "Marrickville",
  is_stub: false,
  owner_has_multiple_non_residential_listings: false,
} satisfies Listing;

const businessListing = {
  ...communityListing,
  name: "ACME Coffee Roasters",
  description:
    "Collect spent coffee grounds and hessian sacks from the back counter.",
  accepted_items: ["Coffee grounds", "Hessian sacks"],
  rejected_items: ["Mixed rubbish"],
  type: "business",
  slug: "test-acme-coffee-roasters",
} satisfies Listing;

const localisedSeoCopies = {
  es: {
    privateHostName: "Anfitrión privado",
    fallbackListingName: "Anuncio",
    residentialConnectName: "esta persona",
    residentialIntro: ({ name, location }) =>
      `${name} acepta restos de comida para compostar${location ? ` en ${location}` : ""}.`,
    businessIntro: ({ name, location }) =>
      `${name} comparte materiales compostables para compostaje${location ? ` en ${location}` : ""}.`,
    connect: ({ name, siteName }) =>
      `Contacta con ${name} en ${siteName}, una plataforma comunitaria que conecta a personas con restos de comida con quienes hacen compost.`,
    acceptedItemsLabel: "Restos de comida aceptados",
    rejectedItemsLabel: "Elementos no aceptados",
    locationKeywords: ({ location }) => [
      location,
      `restos de comida en ${location}`,
      `compostaje en ${location}`,
      `entrega de restos de comida en ${location}`,
      `punto de compostaje en ${location}`,
    ],
    baseKeywords: () => [
      "residuos orgánicos",
      "restos de comida",
      "compostaje",
    ],
  },
  de: {
    privateHostName: "Privater Host",
    fallbackListingName: "Eintrag",
    residentialConnectName: "dieser Person",
    residentialIntro: ({ name, location }) =>
      `${name} nimmt Lebensmittelreste zum Kompostieren${location ? ` in ${location}` : ""} an.`,
    businessIntro: ({ name, location }) =>
      `${name} gibt kompostierbares Material zum Kompostieren${location ? ` in ${location}` : ""} ab.`,
    connect: ({ name, siteName }) =>
      `Verbinde dich mit ${name} auf ${siteName}, eine Community-Plattform, die Menschen mit Lebensmittelresten mit Menschen verbindet, die kompostieren.`,
    acceptedItemsLabel: "Akzeptierte Lebensmittelreste",
    rejectedItemsLabel: "Nicht akzeptierte Dinge",
    locationKeywords: ({ location }) => [
      location,
      `Lebensmittelreste in ${location}`,
      `Kompost in ${location}`,
    ],
    baseKeywords: () => ["Lebensmittelreste", "Kompostierung"],
  },
  "pt-BR": {
    privateHostName: "Anfitrião privado",
    fallbackListingName: "Anúncio",
    residentialConnectName: "essa pessoa",
    residentialIntro: ({ name, location }) =>
      `${name} aceita restos de comida para compostagem${location ? ` em ${location}` : ""}.`,
    businessIntro: ({ name, location }) =>
      `${name} disponibiliza materiais compostáveis para compostagem${location ? ` em ${location}` : ""}.`,
    connect: ({ name, siteName }) =>
      `Entre em contato com ${name} pelo ${siteName}, uma plataforma comunitária que conecta pessoas com restos de comida a quem faz compostagem.`,
    acceptedItemsLabel: "Restos de comida aceitos",
    rejectedItemsLabel: "Itens não aceitos",
    locationKeywords: ({ location }) => [
      location,
      `restos de comida em ${location}`,
      `compostagem em ${location}`,
    ],
    baseKeywords: () => ["resíduos orgânicos", "compostagem"],
  },
  fr: {
    privateHostName: "Hôte privé",
    fallbackListingName: "Annonce",
    residentialConnectName: "cette personne",
    residentialIntro: ({ name, location }) =>
      `${name} accepte les restes alimentaires pour le compostage${location ? ` à ${location}` : ""}.`,
    businessIntro: ({ name, location }) =>
      `${name} propose des matières compostables pour le compostage${location ? ` à ${location}` : ""}.`,
    connect: ({ name, siteName }) =>
      `Contactez ${name} sur ${siteName}, une plateforme communautaire qui met en relation les personnes qui ont des restes alimentaires avec celles qui compostent.`,
    acceptedItemsLabel: "Restes alimentaires acceptés",
    rejectedItemsLabel: "Éléments non acceptés",
    locationKeywords: ({ location }) => [
      location,
      `restes alimentaires à ${location}`,
      `compostage à ${location}`,
    ],
    baseKeywords: () => ["déchets alimentaires", "compostage"],
  },
} satisfies Record<string, ListingSeoCopy>;

test("listing metadata uses the listing name with the site title template", () => {
  const metadata = generateListingMetadata(communityListing, null, {
    includeFullMetadata: true,
  });

  assert.equal(metadata.title, "Neighbourhood compost drop-off");
  assert.equal(metadata.openGraph?.title, "Neighbourhood compost drop-off");
  assert.match(
    JSON.stringify(metadata.openGraph?.images),
    /opengraph-image\.jpg/
  );
  assert.match(
    JSON.stringify(metadata.twitter?.images),
    /opengraph-image\.jpg/
  );
});

test("root metadata canonical matches the sitemap homepage URL", () => {
  const metadata = createPeelsMetadata({ canonicalPath: "/" });

  assert.equal(metadata.alternates?.canonical, "https://www.peels.org");
  assert.equal(metadata.openGraph?.url, "https://www.peels.org");
});

test("shared metadata uses the page title for social previews", () => {
  const metadata = createPeelsMetadata({
    canonicalPath: "/chats",
    title: "Chats",
  });

  assert.equal(metadata.title, "Chats");
  assert.equal(metadata.openGraph?.title, "Chats");
  assert.equal(metadata.twitter?.title, "Chats");
});

test("listing descriptions lead with compost and food-scrap intent", () => {
  const description = generateListingDescription(communityListing, null);

  assert.match(
    description,
    /^Neighbourhood compost drop-off accepts food scraps for composting in Marrickville, Australia\./
  );
  assert.match(description, /local community hub/);
});

test("business listing descriptions use neutral compostable-material intent", () => {
  const description = generateListingDescription(businessListing, null);

  assert.match(
    description,
    /^ACME Coffee Roasters shares compostable material for composting in Marrickville, Australia\./
  );
  assert.match(description, /spent coffee grounds/);
  assert.doesNotMatch(description, /helps people compost food scraps/);
});

test("listing metadata includes the canonical listing path", () => {
  const metadata = generateListingMetadata(communityListing, null, {
    includeFullMetadata: true,
  });

  assert.equal(
    metadata.alternates?.canonical,
    "https://www.peels.org/listings/test-community-compost"
  );
  assert.equal(
    metadata.openGraph?.url,
    "https://www.peels.org/listings/test-community-compost"
  );
});

test("listing metadata can emit Spanish compost intent and keywords", () => {
  const spanishListing = {
    ...communityListing,
    country_code: "NZ",
    area_name: "Te Aro",
  } satisfies Listing;
  const metadata = generateListingMetadata(spanishListing, null, {
    includeFullMetadata: true,
    locale: "es",
    seoCopy: localisedSeoCopies.es,
  });

  assert.match(
    String(metadata.description),
    /^Neighbourhood compost drop-off acepta restos de comida para compostar en Te Aro, Nueva Zelanda\./
  );

  assert.ok(Array.isArray(metadata.keywords));
  assert.ok(
    metadata.keywords.includes("restos de comida en Te Aro, Nueva Zelanda")
  );
  assert.ok(metadata.keywords.includes("residuos orgánicos"));
  assert.ok(!metadata.keywords.includes("food scraps"));
});

test("listing metadata supports every configured non-English SEO locale", () => {
  const expectedIntentByLocale = {
    es: "acepta restos de comida para compostar",
    de: "nimmt Lebensmittelreste zum Kompostieren",
    "pt-BR": "aceita restos de comida para compostagem",
    fr: "accepte les restes alimentaires pour le compostage",
  };

  for (const [locale, expectedIntent] of Object.entries(
    expectedIntentByLocale
  ) as Array<[keyof typeof localisedSeoCopies, string]>) {
    const metadata = generateListingMetadata(communityListing, null, {
      includeFullMetadata: true,
      locale,
      seoCopy: localisedSeoCopies[locale],
    });

    assert.match(String(metadata.description), new RegExp(expectedIntent));
    assert.ok(Array.isArray(metadata.keywords));
    assert.ok(metadata.keywords.length > 0);
  }
});

test("anonymous residential metadata emits an indexable teaser without private details", () => {
  const residentialListing = {
    ...communityListing,
    type: "residential",
    name: null,
    description:
      "Sam's side gate is open after 5pm and the compost bin is beside the shed.",
    accepted_items: ["Banana peels for Sam's worms"],
    rejected_items: ["Citrus near Sam's shed"],
    photos: ["private/sam-backyard.jpg"],
    owner_first_name: "Sam",
    owner_avatar: "sam.jpg",
    slug: "private-host",
  } satisfies Listing;

  const metadata = generateListingMetadata(residentialListing, null, {
    includeFullMetadata: true,
  });
  const description = String(metadata.description);

  assert.equal(metadata.title, "Private Host");
  assert.equal(metadata.robots, undefined);
  assert.match(
    description,
    /^Private Host accepts food scraps for composting in Marrickville, Australia\./
  );
  assert.match(description, /Connect with them on Peels/);
  assert.doesNotMatch(description, /Sam|side gate|shed|Banana|Citrus/);
});

test("anonymous residential metadata avoids leaking profile names with localised SEO copy", () => {
  const residentialListing = {
    ...communityListing,
    type: "residential",
    name: null,
    owner_first_name: "Sam",
    slug: "private-host",
  } satisfies Listing;

  const metadata = generateListingMetadata(residentialListing, null, {
    includeFullMetadata: true,
    locale: "es",
    seoCopy: localisedSeoCopies.es,
  });
  const description = String(metadata.description);

  assert.equal(metadata.title, "Anfitrión privado");
  assert.match(
    description,
    /^Anfitrión privado acepta restos de comida para compostar/
  );
  assert.match(description, /Contacta con esta persona en Peels/);
  assert.doesNotMatch(description, /Sam/);
});

test("anonymous residential teaser keeps public listing content while hiding identity and media", () => {
  const residentialListing = {
    ...communityListing,
    type: "residential",
    name: null,
    description:
      "Drop scraps in the labelled bucket by the side gate after 5pm.",
    accepted_items: ["Fruit scraps", "Coffee grounds"],
    rejected_items: ["Meat", "Dairy"],
    photos: ["private/sam-backyard.jpg"],
    avatar: "private/sam-listing-avatar.jpg",
    owner_first_name: "Sam",
    owner_avatar: "sam.jpg",
    slug: "private-host",
  } satisfies Listing;

  const teaser = getAnonymousSensitiveListingTeaser(residentialListing, null);

  assert.equal(teaser.name, null);
  assert.equal(teaser.owner_first_name, null);
  assert.equal(teaser.owner_avatar, null);
  assert.equal(teaser.avatar, null);
  assert.equal(teaser.photos, null);
  assert.equal(teaser.description, residentialListing.description);
  assert.deepEqual(teaser.accepted_items, residentialListing.accepted_items);
  assert.deepEqual(teaser.rejected_items, residentialListing.rejected_items);
  assert.deepEqual(teaser.coordinates, residentialListing.coordinates);
});

test("anonymous unknown-type metadata emits a private teaser", () => {
  const unknownTypeListing = {
    ...communityListing,
    type: null,
    name: "Sam's untyped backyard bin",
    description: "Sam's side gate is open and the bin is beside the shed.",
    accepted_items: ["Banana peels for Sam's worms"],
    rejected_items: ["Citrus near Sam's shed"],
    photos: ["private/sam-backyard.jpg"],
    owner_first_name: "Sam",
    owner_avatar: "sam.jpg",
    slug: "unknown-type-listing",
  } satisfies Listing;

  const metadata = generateListingMetadata(unknownTypeListing, null, {
    includeFullMetadata: true,
  });
  const description = String(metadata.description);
  const teaser = getAnonymousSensitiveListingTeaser(unknownTypeListing, null);

  assert.equal(metadata.title, "Private Host");
  assert.match(
    description,
    /^Private Host accepts food scraps for composting in Marrickville, Australia\./
  );
  assert.match(description, /Connect with them on Peels/);
  assert.doesNotMatch(description, /Sam|side gate|shed|Banana|Citrus/);
  assert.equal(teaser.name, null);
  assert.equal(teaser.description, null);
  assert.equal(teaser.accepted_items, null);
  assert.equal(teaser.coordinates, null);
});

test("authenticated residential metadata can use private display names", () => {
  const residentialListing = {
    ...communityListing,
    type: "residential",
    name: null,
    owner_first_name: "Sam",
    slug: "private-host",
  } satisfies Listing;

  const metadata = generateListingMetadata(residentialListing, {
    id: "user-1",
  });

  assert.equal(metadata.title, "Sam");
  assert.match(
    String(metadata.description),
    /^Sam accepts food scraps for composting in Marrickville, Australia\./
  );
  assert.match(String(metadata.description), /Connect with Sam on Peels/);
  assert.doesNotMatch(String(metadata.description), /helps people compost/);
  assert.equal(residentialListing.name, null);
  assert.equal(metadata.robots, undefined);
});

test("anonymous residential avatars can use localised private-host alt text", () => {
  const residentialListing = {
    ...communityListing,
    type: "residential",
    name: null,
    owner_first_name: "Sam",
    slug: "private-host",
  } satisfies Listing;

  const avatar = getListingAvatar(residentialListing, null, {
    privateHostName: "Anfitrión privado",
    fallbackListingName: "Anuncio",
    privateHostAvatarAlt:
      "Un avatar difuminado de Anfitrión privado. Inicia sesión para ver la información completa.",
  });

  assert.equal(
    avatar?.alt,
    "Un avatar difuminado de Anfitrión privado. Inicia sesión para ver la información completa."
  );
  assert.doesNotMatch(avatar?.alt ?? "", /Private Host/);
});

test("demo residential listings use bundled demo avatar paths", () => {
  const avatar = getListingAvatar(
    {
      is_demo: true,
      type: "residential",
      owner_first_name: "Becca",
      avatar: "sunflowers.jpg",
    },
    null
  );

  assert.equal(avatar?.isDemo, true);
  assert.equal(avatar?.path, "/avatars/demo/sunflowers.jpg");
  assert.match(avatar?.alt ?? "", /Becca/);
});

test("listing JSON-LD describes the public listing page and place conservatively", () => {
  const jsonLd = generateListingJsonLd(communityListing, null);

  assert.ok(jsonLd);
  assert.equal(jsonLd["@type"], "WebPage");
  assert.equal(jsonLd.name, "Neighbourhood compost drop-off");
  assert.equal(
    jsonLd.url,
    "https://www.peels.org/listings/test-community-compost"
  );
  assert.equal(jsonLd.about["@type"], "Place");
  assert.ok(jsonLd.about.address);
  assert.equal(jsonLd.about.address.addressLocality, "Marrickville");
  assert.equal(jsonLd.about.address.addressCountry, "Australia");
  assert.deepEqual(jsonLd.about.additionalProperty, [
    {
      "@type": "PropertyValue",
      name: "Accepted food scraps",
      propertyID: "acceptedItems",
      value: "Food scraps",
    },
    {
      "@type": "PropertyValue",
      name: "Items not accepted",
      propertyID: "rejectedItems",
      value: "Meat and dairy",
    },
  ]);
});

test("listing JSON-LD can use localised descriptions, country names, and language", () => {
  const spanishListing = {
    ...communityListing,
    country_code: "NZ",
    area_name: "Te Aro",
  } satisfies Listing;
  const jsonLd = generateListingJsonLd(spanishListing, null, {
    locale: "es",
    seoCopy: localisedSeoCopies.es,
  });

  assert.ok(jsonLd);
  assert.equal(jsonLd.inLanguage, "es");
  assert.match(
    jsonLd.description,
    /^Neighbourhood compost drop-off acepta restos de comida para compostar en Te Aro, Nueva Zelanda\./
  );
  assert.ok(jsonLd.about.address);
  assert.equal(jsonLd.about.address.addressCountry, "Nueva Zelanda");
  assert.deepEqual(jsonLd.about.additionalProperty, [
    {
      "@type": "PropertyValue",
      name: "Restos de comida aceptados",
      propertyID: "acceptedItems",
      value: "Food scraps",
    },
    {
      "@type": "PropertyValue",
      name: "Elementos no aceptados",
      propertyID: "rejectedItems",
      value: "Meat and dairy",
    },
  ]);
});

test("anonymous residential listing JSON-LD omits structured location details", () => {
  const residentialListing = {
    ...communityListing,
    type: "residential",
    name: null,
    description:
      "Sam's side gate is open after 5pm and the compost bin is beside the shed.",
    accepted_items: ["Banana peels for Sam's worms"],
    rejected_items: ["Citrus near Sam's shed"],
    photos: ["private/sam-backyard.jpg"],
    avatar: "private/sam-listing-avatar.jpg",
    owner_first_name: "Sam",
    owner_avatar: "sam.jpg",
    slug: "private-host",
  } satisfies Listing;

  const jsonLd = generateListingJsonLd(residentialListing, null);

  assert.ok(jsonLd);
  assert.equal(jsonLd.name, "Private Host");
  assert.match(
    jsonLd.description,
    /^Private Host accepts food scraps for composting in Marrickville, Australia\./
  );
  assert.doesNotMatch(
    JSON.stringify(jsonLd),
    /Sam|side gate|shed|Banana|Citrus|sam-backyard|sam-listing-avatar/
  );
  assert.equal(jsonLd.about.address, undefined);
  assert.equal(jsonLd.about.geo, undefined);
  assert.equal(jsonLd.about.image, undefined);
  assert.equal(jsonLd.about.additionalProperty, undefined);
});

test("anonymous listing JSON-LD treats missing listing types as sensitive", () => {
  const unknownTypeListing = {
    ...communityListing,
    type: null,
    name: "Sam's untyped backyard bin",
    description: "Sam's side gate is open and the bin is beside the shed.",
    accepted_items: ["Banana peels for Sam's worms"],
    rejected_items: ["Citrus near Sam's shed"],
    photos: ["private/sam-backyard.jpg"],
    owner_first_name: "Sam",
    owner_avatar: "sam.jpg",
    slug: "unknown-type-listing",
  } satisfies Listing;

  const jsonLd = generateListingJsonLd(unknownTypeListing, null);

  assert.ok(jsonLd);
  assert.equal(jsonLd.name, "Private Host");
  assert.match(
    jsonLd.description,
    /^Private Host accepts food scraps for composting in Marrickville, Australia\./
  );
  assert.doesNotMatch(
    JSON.stringify(jsonLd),
    /Sam|side gate|shed|Banana|Citrus|sam-backyard/
  );
  assert.equal(jsonLd.about.address, undefined);
  assert.equal(jsonLd.about.geo, undefined);
  assert.equal(jsonLd.about.image, undefined);
  assert.equal(jsonLd.about.additionalProperty, undefined);
});
