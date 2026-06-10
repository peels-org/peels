import { expect, test, type Locator, type Page } from "@playwright/test";

import { STORED_MAP_VIEW_KEY } from "../src/features/map/lib/mapStorageConstants";
import { createMockGeocodingFeature, mockMapTilerGeocoding } from "./helpers";

type StoredMapView = {
  latitude: number;
  longitude: number;
  zoom: number;
};

const INNER_WEST_MAP_VIEW: StoredMapView = {
  latitude: -33.91,
  longitude: 151.16,
  zoom: 7,
};
const MAP_MARKER_RENDER_TIMEOUT_MS = 20_000;

function getMapCookieUrl() {
  const baseURL = test.info().project.use.baseURL;

  if (typeof baseURL !== "string") {
    throw new Error("Expected Playwright baseURL to be configured");
  }

  return new URL("/map", baseURL).toString();
}

async function seedStoredMapView(page: Page, view: StoredMapView) {
  await page.context().addCookies([
    {
      name: STORED_MAP_VIEW_KEY,
      value: encodeURIComponent(JSON.stringify(view)),
      url: getMapCookieUrl(),
    },
  ]);

  await page.addInitScript(
    ([storageKey, storedView]) => {
      window.localStorage.setItem(storageKey, JSON.stringify(storedView));
    },
    [STORED_MAP_VIEW_KEY, view] as const
  );
}

async function seedStoredMapViewLocalStorageOnly(
  page: Page,
  view: StoredMapView
) {
  await page.addInitScript(
    ([storageKey, storedView]) => {
      window.localStorage.setItem(storageKey, JSON.stringify(storedView));
    },
    [STORED_MAP_VIEW_KEY, view] as const
  );
}

async function readStoredMapView(page: Page) {
  const value = await page.evaluate(
    (storageKey) => window.localStorage.getItem(storageKey),
    STORED_MAP_VIEW_KEY
  );

  return value ? (JSON.parse(value) as StoredMapView) : null;
}

async function readStoredMapViewCookie(page: Page) {
  const cookies = await page.context().cookies(getMapCookieUrl());
  const cookie = cookies.find(({ name }) => name === STORED_MAP_VIEW_KEY);

  return cookie
    ? (JSON.parse(decodeURIComponent(cookie.value)) as StoredMapView)
    : null;
}

async function mockMapTilerIpCountry(page: Page, countryCode: string) {
  await page.route(/api\.maptiler\.com\/geolocation/i, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        country_code: countryCode,
        latitude: 19.4326,
        longitude: -99.1332,
      }),
    });
  });
}

function parseNumberParam(url: URL, name: string) {
  const value = url.searchParams.get(name);
  return value ? value.split(",").map(Number) : null;
}

function roundCookieExpectation(value: number) {
  const roundedValue = Number(value.toFixed(2));
  return Object.is(roundedValue, -0) ? 0 : roundedValue;
}

function expectStoredMapViewToMatch(
  actual: StoredMapView | null,
  expected: StoredMapView
) {
  expect(actual).not.toBeNull();
  expect(actual?.latitude).toBeCloseTo(expected.latitude, 5);
  expect(actual?.longitude).toBeCloseTo(expected.longitude, 5);
  expect(actual?.zoom).toBeCloseTo(expected.zoom, 2);
}

async function expectMapPinDetailScale(page: Page, expectedScale: number) {
  await expect
    .poll(
      async () =>
        page.getByTestId("map-view").evaluate((element) => {
          const value = getComputedStyle(element).getPropertyValue(
            "--map-pin-detail-scale"
          );

          return Number.parseFloat(value);
        }),
      { timeout: 5000 }
    )
    .toBeCloseTo(expectedScale, 2);
}

async function expectMapPinVisualWidth(
  locator: Locator,
  expectedWidth: number
) {
  await expect
    .poll(
      async () =>
        locator.evaluate((element) => element.getBoundingClientRect().width),
      { timeout: 5000 }
    )
    .toBeCloseTo(expectedWidth, 1);
}

async function zoomInUntilMapPinsAreDetailed(page: Page) {
  for (let i = 0; i < 5; i += 1) {
    const detailScale = await page
      .getByTestId("map-view")
      .evaluate((element) =>
        Number.parseFloat(
          getComputedStyle(element).getPropertyValue("--map-pin-detail-scale")
        )
      );
    if (detailScale >= 0.99) return;

    await page.getByTestId("map-control-zoom-in").click();
    await page.waitForTimeout(500);
  }

  await expectMapPinDetailScale(page, 1);
}

async function focusMapControlByKeyboard(page: Page, testId: string) {
  for (let i = 0; i < 20; i += 1) {
    await page.keyboard.press("Tab");
    const activeTestId = await page.evaluate(() =>
      document.activeElement?.getAttribute("data-testid")
    );

    if (activeTestId === testId) return;
  }

  throw new Error(`Could not focus ${testId} by keyboard`);
}

test("map mounts when IP location is unavailable and restores the last view", async ({
  page,
}) => {
  let geolocationRequests = 0;

  await page.route(/api\.maptiler\.com\/geolocation/i, async (route) => {
    geolocationRequests += 1;
    await new Promise((resolve) => setTimeout(resolve, 2000));
    await route.abort("failed");
  });

  try {
    await page.goto("/map", { waitUntil: "domcontentloaded" });

    const mapView = page.getByTestId("map-view");
    await expect(mapView.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 10_000,
    });
    expect(await readStoredMapView(page)).toBeNull();

    await focusMapControlByKeyboard(page, "map-control-search");
    await expect(page.getByTestId("map-control-search")).toBeFocused();
    await expect
      .poll(() =>
        page
          .getByTestId("map-control-search")
          .evaluate((element) => getComputedStyle(element).boxShadow)
      )
      .toContain("inset");
    await focusMapControlByKeyboard(page, "map-control-zoom-in");
    await expect(page.getByTestId("map-control-zoom-in")).toBeFocused();
    await expect
      .poll(() =>
        page
          .getByTestId("map-control-zoom-in")
          .evaluate((element) => getComputedStyle(element).boxShadow)
      )
      .toContain("inset");

    await page.getByTestId("map-control-zoom-in").click();

    await expect
      .poll(
        async () => {
          const storedView = await readStoredMapView(page);
          return storedView?.zoom ?? null;
        },
        { timeout: 5000 }
      )
      .toBeGreaterThan(1.5);
    const storedAfterMove = await readStoredMapView(page);
    expect(storedAfterMove).not.toBeNull();
    if (!storedAfterMove) throw new Error("Expected stored map view");
    const cookieAfterMove = await readStoredMapViewCookie(page);
    expect(cookieAfterMove).toEqual({
      latitude: roundCookieExpectation(storedAfterMove.latitude),
      longitude: roundCookieExpectation(storedAfterMove.longitude),
      zoom: roundCookieExpectation(storedAfterMove.zoom),
    });

    await page.reload({ waitUntil: "domcontentloaded" });

    await expect(mapView.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 10_000,
    });
    expectStoredMapViewToMatch(await readStoredMapView(page), storedAfterMove);

    await page.getByTestId("map-control-zoom-in").click();
    await expect
      .poll(async () => {
        const storedView = await readStoredMapView(page);
        return storedView?.zoom ?? null;
      })
      .toBeGreaterThan(storedAfterMove.zoom + 0.5);
    const storedAfterRestoredZoom = await readStoredMapView(page);
    expect(storedAfterRestoredZoom?.latitude).toBeCloseTo(
      storedAfterMove.latitude,
      5
    );
    expect(storedAfterRestoredZoom?.longitude).toBeCloseTo(
      storedAfterMove.longitude,
      5
    );
    expect(storedAfterRestoredZoom?.zoom).toBeGreaterThan(
      storedAfterMove.zoom + 0.5
    );
    expect(geolocationRequests).toBeGreaterThanOrEqual(1);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("map restores a localStorage-only view after hydration", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Hydration failed")
    ) {
      hydrationErrors.push(message.text());
    }
  });

  await page.route(/api\.maptiler\.com\/geolocation/i, (route) =>
    route.abort("failed")
  );
  await seedStoredMapViewLocalStorageOnly(page, {
    ...INNER_WEST_MAP_VIEW,
    zoom: 9,
  });

  try {
    await page.goto("/map", { waitUntil: "domcontentloaded" });

    const mapView = page.getByTestId("map-view");
    await expect(mapView.locator(".maplibregl-canvas")).toBeVisible({
      timeout: 10_000,
    });
    await expectMapPinDetailScale(page, 1);
    expect(hydrationErrors).toEqual([]);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("map search palette flies to a picked geocoding result", async ({
  page,
}) => {
  const feature = createMockGeocodingFeature({
    text: "Newtown",
    placeName: "Newtown, New South Wales, Australia",
    center: [151.1781, -33.8985],
  });
  await seedStoredMapView(page, INNER_WEST_MAP_VIEW);
  await mockMapTilerGeocoding(page, feature);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  const mapView = page.getByTestId("map-view");
  await expect(mapView.locator(".maplibregl-canvas")).toBeVisible({
    timeout: 10_000,
  });

  await page.getByTestId("map-control-search").click();
  const searchInput = page.getByTestId("geocoding-search-input");
  await expect(searchInput).toBeFocused();
  await expect(page.getByTestId("map-search-close")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("map-search-dialog")).toBeHidden();

  await page.getByTestId("map-control-search").click();
  await expect(searchInput).toBeFocused();
  await searchInput.fill("Newtown");
  await expect
    .poll(async () =>
      searchInput.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize)
      )
    )
    .toBeGreaterThanOrEqual(16);
  await page.getByRole("option", { name: /Newtown/ }).click();
  await expect(page.getByTestId("map-search-dialog")).toBeHidden();

  await expect
    .poll(
      async () => {
        const storedView = await readStoredMapView(page);
        return storedView?.latitude ?? null;
      },
      { timeout: 5000 }
    )
    .toBeCloseTo(-33.8985, 1);
});

test("map search is bounded by the current map instead of IP country", async ({
  page,
}) => {
  const geocodingRequests: URL[] = [];
  const feature = createMockGeocodingFeature({
    text: "Newtown",
    placeName: "Newtown, New South Wales, Australia",
    center: [151.1781, -33.8985],
  });

  await seedStoredMapView(page, INNER_WEST_MAP_VIEW);
  await mockMapTilerIpCountry(page, "MX");
  await page.route("**/geocoding/**", async (route) => {
    geocodingRequests.push(new URL(route.request().url()));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        type: "FeatureCollection",
        query: [],
        features: [feature],
        attribution: "Mock MapTiler geocoding",
      }),
    });
  });

  try {
    await page.goto("/map", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByTestId("map-view").locator(".maplibregl-canvas")
    ).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("map-control-search").click();
    await page.getByTestId("geocoding-search-input").fill("Newtown");
    await expect(page.getByRole("option", { name: /Newtown/ })).toBeVisible();

    expect(geocodingRequests).toHaveLength(1);
    const [boundedRequest] = geocodingRequests;
    expect(boundedRequest.searchParams.get("country")).toBeNull();
    expect(boundedRequest.searchParams.get("proximity")).not.toBe("ip");

    const proximity = parseNumberParam(boundedRequest, "proximity");
    expect(proximity).not.toBeNull();
    expect(proximity?.[0]).toBeCloseTo(INNER_WEST_MAP_VIEW.longitude, 1);
    expect(proximity?.[1]).toBeCloseTo(INNER_WEST_MAP_VIEW.latitude, 1);

    const bbox = parseNumberParam(boundedRequest, "bbox");
    expect(bbox).not.toBeNull();
    if (!bbox) throw new Error("Expected map search request to include bbox");
    const [west, south, east, north] = bbox;
    expect(west).toBeLessThan(INNER_WEST_MAP_VIEW.longitude);
    expect(east).toBeGreaterThan(INNER_WEST_MAP_VIEW.longitude);
    expect(south).toBeLessThan(INNER_WEST_MAP_VIEW.latitude);
    expect(north).toBeGreaterThan(INNER_WEST_MAP_VIEW.latitude);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("map search retries without bounds when the bounded search is empty", async ({
  page,
}) => {
  const geocodingRequests: URL[] = [];
  const fallbackFeature = createMockGeocodingFeature({
    id: "place.fallback",
    text: "Melbourne",
    placeName: "Melbourne, Victoria, Australia",
    center: [144.9631, -37.8136],
  });

  await seedStoredMapView(page, INNER_WEST_MAP_VIEW);
  await mockMapTilerIpCountry(page, "MX");
  await page.route("**/geocoding/**", async (route) => {
    const url = new URL(route.request().url());
    geocodingRequests.push(url);
    const isBoundedRequest = url.searchParams.has("bbox");

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        type: "FeatureCollection",
        query: [],
        features: isBoundedRequest ? [] : [fallbackFeature],
        attribution: "Mock MapTiler geocoding",
      }),
    });
  });

  try {
    await page.goto("/map", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByTestId("map-view").locator(".maplibregl-canvas")
    ).toBeVisible({
      timeout: 10_000,
    });

    await page.getByTestId("map-control-search").click();
    await page.getByTestId("geocoding-search-input").fill("Melbourne");
    await page.getByRole("option", { name: /Melbourne/ }).click();

    expect(geocodingRequests).toHaveLength(2);
    expect(geocodingRequests[0].searchParams.has("bbox")).toBe(true);
    expect(geocodingRequests[1].searchParams.has("bbox")).toBe(false);
    expect(geocodingRequests[1].searchParams.get("country")).toBeNull();
    expect(geocodingRequests[1].searchParams.get("proximity")).not.toBe("ip");

    await expect
      .poll(
        async () => {
          const storedView = await readStoredMapView(page);
          return storedView?.latitude ?? null;
        },
        { timeout: 5000 }
      )
      .toBeCloseTo(-37.8136, 1);
  } finally {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  }
});

test("map pins minify at country zoom, then grow and animate selection", async ({
  page,
}) => {
  const hydrationErrors: string[] = [];
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      message.text().includes("Hydration failed")
    ) {
      hydrationErrors.push(message.text());
    }
  });

  await seedStoredMapView(page, INNER_WEST_MAP_VIEW);

  await page.goto("/map", { waitUntil: "domcontentloaded" });

  const mapView = page.getByTestId("map-view");
  await expect(mapView.locator(".maplibregl-canvas")).toBeVisible({
    timeout: 10_000,
  });

  const firstPin = page.getByTestId("map-pin").first();
  await expect(firstPin).toBeVisible({
    timeout: MAP_MARKER_RENDER_TIMEOUT_MS,
  });
  await expectMapPinDetailScale(page, 0);
  await expectMapPinVisualWidth(
    firstPin.locator('[data-testid="map-pin-compact-dot"]'),
    10
  );
  await expect(
    firstPin.locator('[data-testid="map-pin-compact-icon"]')
  ).toHaveCSS("opacity", "0");
  expect(hydrationErrors).toEqual([]);

  const minifiedTargetMarker = page
    .getByRole("button", { name: "Map marker" })
    .last();
  const minifiedTargetPin = minifiedTargetMarker.getByTestId("map-pin");
  const minifiedTargetPinHandle = await minifiedTargetPin.elementHandle();
  expect(minifiedTargetPinHandle).not.toBeNull();

  await minifiedTargetPin.click();
  await expect
    .poll(
      async () =>
        minifiedTargetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("open");

  await mapView.click({ position: { x: 20, y: 450 } });
  await expect
    .poll(
      async () =>
        minifiedTargetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("compact");

  await minifiedTargetMarker.focus();
  await page.keyboard.press("Enter");
  await expect
    .poll(
      async () =>
        minifiedTargetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("open");

  await mapView.click({ position: { x: 20, y: 450 } });
  await expect
    .poll(
      async () =>
        minifiedTargetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("compact");

  await minifiedTargetMarker.focus();
  await page.keyboard.press("Space");
  await expect
    .poll(
      async () =>
        minifiedTargetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("open");

  await mapView.click({ position: { x: 20, y: 450 } });
  await expect
    .poll(
      async () =>
        minifiedTargetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("compact");

  await zoomInUntilMapPinsAreDetailed(page);

  await expectMapPinDetailScale(page, 1);
  await expectMapPinVisualWidth(
    firstPin.locator('[data-testid="map-pin-compact-dot"]'),
    24
  );
  await expect(
    firstPin.locator('[data-testid="map-pin-compact-icon"]')
  ).toHaveCSS("opacity", "1");

  const targetMarker = page.getByRole("button", { name: "Map marker" }).last();
  const targetPin = targetMarker.getByTestId("map-pin");
  const targetPinHandle = await targetPin.elementHandle();
  expect(targetPinHandle).not.toBeNull();

  await targetPin.click();
  await expect
    .poll(
      async () =>
        targetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("open");
  await expect
    .poll(
      async () =>
        targetPinHandle!.evaluate((element) => {
          const openLayer = element.querySelector(
            '[data-testid="map-pin-open-layer"]'
          );
          if (!openLayer) return null;

          return getComputedStyle(openLayer).visibility;
        }),
      { timeout: 5000 }
    )
    .toBe("visible");

  const rootWasPreserved = await targetPinHandle!.evaluate(
    (element) =>
      element.isConnected &&
      element.getAttribute("data-map-pin-state") === "open"
  );
  expect(rootWasPreserved).toBe(true);

  await mapView.click({ position: { x: 20, y: 450 } });
  await expect
    .poll(
      async () =>
        targetPinHandle!.evaluate((element) =>
          element.getAttribute("data-map-pin-state")
        ),
      { timeout: 5000 }
    )
    .toBe("compact");
  await expect
    .poll(
      async () =>
        targetPinHandle!.evaluate((element) => {
          const compactIcon = element.querySelector(
            '[data-testid="map-pin-compact-icon"]'
          );
          if (!compactIcon) return null;

          return getComputedStyle(compactIcon).opacity;
        }),
      { timeout: 5000 }
    )
    .toBe("1");
});
