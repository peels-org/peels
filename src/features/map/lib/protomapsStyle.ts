import { layers, namedFlavor } from "@protomaps/basemaps";

import { MAP_MAX_ZOOM } from "./mapUtils";

type ProtomapsFlavorName = "light" | "dark";

const PROTOMAPS_TILE_API_BASE_URL = "https://api.protomaps.com/tiles/v4";
let hasWarnedMissingProtomapsApiKey = false;

const PROTOMAPS_LANGUAGE_BY_LOCALE: Record<string, string> = {
  en: "en",
  es: "es",
  de: "de",
  "pt-BR": "pt",
  fr: "fr",
};

export function getProtomapsLanguage(locale: string) {
  return PROTOMAPS_LANGUAGE_BY_LOCALE[locale] ?? "en";
}

export function createProtomapsStyle({
  flavorName,
  locale,
}: {
  flavorName: ProtomapsFlavorName;
  locale: string;
}) {
  const apiKey = process.env.NEXT_PUBLIC_PROTOMAPS_API_KEY;
  const tileUrl = `${PROTOMAPS_TILE_API_BASE_URL}/{z}/{x}/{y}.mvt${
    apiKey ? `?key=${encodeURIComponent(apiKey)}` : ""
  }`;

  if (!apiKey && !hasWarnedMissingProtomapsApiKey) {
    hasWarnedMissingProtomapsApiKey = true;
    console.warn("NEXT_PUBLIC_PROTOMAPS_API_KEY is not configured.");
  }

  return {
    version: 8 as const,
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sprite: `https://protomaps.github.io/basemaps-assets/sprites/v4/${flavorName}`,
    sources: {
      protomaps: {
        type: "vector" as const,
        maxzoom: MAP_MAX_ZOOM,
        tiles: [tileUrl],
        attribution:
          '<a href="https://protomaps.com">Protomaps</a> • <a href="https://osm.org/copyright">OpenStreetMap</a>',
      },
    },
    layers: layers("protomaps", namedFlavor(flavorName), {
      lang: getProtomapsLanguage(locale),
    }),
  };
}
