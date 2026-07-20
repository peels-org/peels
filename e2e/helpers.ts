import { execFileSync } from "node:child_process";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";

export const HOST_EMAIL = "demo-host@peels.local";
export const DONOR_EMAIL = "demo-donor@peels.local";
export const SEEDED_PASSWORD = "peels-demo-password";
export const SEEDED_THREAD_ID = "33333333-3333-4333-8333-333333333333";
export const SECOND_SEEDED_THREAD_ID = "77777777-7777-4777-8777-777777777777";
export const HOST_SECOND_SEEDED_THREAD_ID =
  "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
export const PROFILE_RENDER_TIMEOUT_MS = 15_000;

export function parseLocalSupabaseEnv() {
  const output = execFileSync("supabase", ["status", "-o", "env"], {
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((env, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = line.slice(0, separatorIndex);
      const value = line.slice(separatorIndex + 1).replace(/^"(.*)"$/, "$1");
      env[key] = value;
      return env;
    }, {});
}

export function createAdminClient(): SupabaseClient {
  const env = parseLocalSupabaseEnv();

  return createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

type MockGeocodingFeatureOptions = {
  id?: string;
  text?: string;
  placeName?: string;
  placeType?: string[];
  context?: Array<{
    id: string;
    text: string;
  }>;
  center?: [number, number];
  countryCode?: string;
};

export function createMockGeocodingFeature({
  id = "place.123",
  text = "Newtown",
  placeName = "Newtown, New South Wales, Australia",
  placeType = ["place"],
  context,
  center = [151.1781, -33.8985],
  countryCode = "AU",
}: MockGeocodingFeatureOptions = {}) {
  return {
    id,
    type: "Feature",
    text,
    place_name: placeName,
    place_type: placeType,
    place_type_name: placeType,
    context,
    center,
    bbox: [center[0], center[1], center[0], center[1]],
    geometry: {
      type: "Point",
      coordinates: center,
    },
    properties: {
      ref: id,
      country_code: countryCode,
    },
    relevance: 1,
  };
}

export async function mockMapTilerGeocoding(
  page: Page,
  feature = createMockGeocodingFeature()
) {
  await page.route("**/geocoding/**", async (route) => {
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
}

export async function signIn(
  page: Page,
  {
    email,
    redirectTo = "/profile",
    expectedPath = redirectTo,
  }: {
    email: string;
    redirectTo?: string;
    expectedPath?: string;
  }
) {
  await page.goto(`/sign-in?redirect_to=${encodeURIComponent(redirectTo)}`);

  await expect(page.getByTestId("sign-in-form")).toBeVisible();

  await page.locator("#email").fill(email);
  await page.locator("#password").fill(SEEDED_PASSWORD);

  const expectedUrl = new URL(expectedPath, page.url());

  await Promise.all([
    page.waitForURL(
      (url) =>
        url.pathname === expectedUrl.pathname &&
        url.search === expectedUrl.search
    ),
    page.getByTestId("sign-in-submit").click(),
  ]);
}

export async function delayServerActionRequests(page: Page, delayMs = 500) {
  await page.route("**/*", async (route) => {
    const request = route.request();
    const isServerActionRequest =
      request.method() === "POST" &&
      request.headers()["next-action"] !== undefined;

    if (!isServerActionRequest) {
      await route.fallback();
      return;
    }

    await page.waitForTimeout(delayMs);
    await route.continue();
  });
}

export async function delayProfileActionRequests(page: Page, delayMs = 500) {
  await delayServerActionRequests(page, delayMs);
}

export async function delayChatSendRequests(page: Page, delayMs = 500) {
  await page.route(/\/rest\/v1\/chat_messages(?:\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      await page.waitForTimeout(delayMs);
    }

    await route.continue();
  });
}

export async function failChatSendRequests(
  page: Page,
  message = "Synthetic chat failure"
) {
  await page.route(/\/rest\/v1\/chat_messages(?:\?|$)/, async (route) => {
    if (route.request().method() === "POST") {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message }),
      });
      return;
    }

    await route.continue();
  });
}
