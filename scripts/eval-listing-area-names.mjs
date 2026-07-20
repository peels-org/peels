#!/usr/bin/env node
/**
 * Manual worldwide check for listing public area labels.
 *
 * Usage:
 *   npx tsx scripts/eval-listing-area-names.mjs
 *
 * Not run in CI — use when tuning derivePublicAreaName rules against live data.
 */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  derivePublicAreaName,
  derivePublicAreaNameFromSelectedFeature,
} from "../src/utils/listingAreaName.ts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

function loadEnvKey() {
  if (process.env.NEXT_PUBLIC_MAPTILER_API_KEY) {
    return process.env.NEXT_PUBLIC_MAPTILER_API_KEY;
  }

  try {
    const envPath = path.join(repoRoot, ".env.local");
    const contents = readFileSync(envPath, "utf8");
    const match = contents.match(/^NEXT_PUBLIC_MAPTILER_API_KEY=(.*)$/m);
    if (match?.[1]) {
      return match[1].trim().replace(/^["']|["']$/g, "");
    }
  } catch {
    // Optional local env file.
  }

  return null;
}

const SAMPLES = [
  {
    query: "Fitzroy, Melbourne",
    country: "AU",
    note: "Inner-suburb neighbourhood",
  },
  {
    query: "42 Oxford Street, Darlinghurst NSW",
    country: "AU",
    note: "Sydney inner suburb street",
  },
  {
    query: "5 Cuba Street, Wellington",
    country: "NZ",
    note: "Te Aro / Wellington",
  },
  {
    query: "123 Valencia Street, San Francisco",
    country: "US",
    note: "Mission District / SF",
  },
  {
    query: "Bergmannstraße 10, Berlin",
    country: "DE",
    note: "Kreuzberg / Berlin",
  },
  {
    query: "Carrer de Verdi 8, Barcelona",
    country: "ES",
    note: "Gràcia / Barcelona",
  },
  {
    query: "University of Melbourne",
    country: "AU",
    note: "Campus POI should not become the public label if context exists",
  },
];

async function main() {
  const apiKey = loadEnvKey();
  if (!apiKey) {
    console.error("Missing NEXT_PUBLIC_MAPTILER_API_KEY (env or .env.local).");
    process.exit(1);
  }

  console.log("Evaluating listing area names against MapTiler…\n");

  for (const sample of SAMPLES) {
    const forwardUrl = new URL(
      `https://api.maptiler.com/geocoding/${encodeURIComponent(sample.query)}.json`
    );
    forwardUrl.searchParams.set("key", apiKey);
    forwardUrl.searchParams.set("country", sample.country);
    forwardUrl.searchParams.set(
      "types",
      "address,road,place,neighbourhood,locality,municipal_district,municipality"
    );
    forwardUrl.searchParams.set("limit", "5");
    forwardUrl.searchParams.set("autocomplete", "false");

    const forwardResponse = await fetch(forwardUrl);
    if (!forwardResponse.ok) {
      console.log(`✖ ${sample.query}`);
      console.log(`  forward failed: ${forwardResponse.status}\n`);
      continue;
    }

    const forwardJson = await forwardResponse.json();
    const top = forwardJson.features?.[0];
    if (!top) {
      console.log(`✖ ${sample.query}`);
      console.log(`  no forward results (${sample.note})\n`);
      continue;
    }

    const fromSelected = derivePublicAreaNameFromSelectedFeature(top);
    let fromReverse = null;

    if (Array.isArray(top.center) && top.center.length >= 2) {
      const [lng, lat] = top.center;
      const reverseUrl = new URL(
        `https://api.maptiler.com/geocoding/${lng},${lat}.json`
      );
      reverseUrl.searchParams.set("key", apiKey);
      reverseUrl.searchParams.set("types", "poi");
      reverseUrl.searchParams.set("excludeTypes", "true");

      const reverseResponse = await fetch(reverseUrl);
      if (reverseResponse.ok) {
        const reverseJson = await reverseResponse.json();
        fromReverse = derivePublicAreaName(reverseJson.features ?? []);
      }
    }

    console.log(`• ${sample.query}`);
    console.log(`  note: ${sample.note}`);
    console.log(`  top match: ${top.place_name}`);
    console.log(`  from selected: ${fromSelected?.name ?? "(null)"}`);
    console.log(`  from reverse:  ${fromReverse?.name ?? "(null)"}`);
    console.log("");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
