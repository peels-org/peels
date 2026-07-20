import { expect, test } from "@playwright/test";
import {
  DONOR_EMAIL,
  HOST_EMAIL,
  PROFILE_RENDER_TIMEOUT_MS,
  createAdminClient,
  createMockGeocodingFeature,
  delayServerActionRequests,
  mockMapTilerGeocoding,
  signIn,
} from "./helpers";

const BUSINESS_LISTING_EDIT_PATH = "/profile/listings/demo-inner-west-cafe";
const BUSINESS_LISTING_SLUG = "demo-inner-west-cafe";
const MAP_MULTI_PHOTO_LISTING_PATH = "/map?listing=demo-marrickville-compost";
const PUBLIC_MULTI_PHOTO_LISTING_PATH = "/listings/demo-marrickville-compost";
const RESIDENTIAL_LISTING_EDIT_PATH =
  "/profile/listings/demo-newtown-worm-farm";
const ALTERNATE_BUSINESS_DESCRIPTION =
  "A demo business listing with a slightly different description for e2e coverage.";

function requireHref(href: string | null) {
  expect(
    href,
    "Expected listing photo thumbnail to have an href"
  ).not.toBeNull();

  if (!href) {
    throw new Error("Expected listing photo thumbnail to have an href");
  }

  return href;
}

test("profile loads the seeded host account and listings", async ({ page }) => {
  await signIn(page, { email: HOST_EMAIL, redirectTo: "/profile" });

  await expect(page.getByTestId("profile-first-name")).toHaveText(/\S+/, {
    timeout: PROFILE_RENDER_TIMEOUT_MS,
  });
  await expect(page.getByTestId("profile-listings")).toContainText(
    "Marrickville Neighbourhood Compost"
  );
  await expect(page.getByTestId("profile-listings")).toContainText(
    "Inner West Cafe Compost Pickup"
  );
});

test("listing type chooser routes signed-in hosts to the selected form", async ({
  page,
}) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: "/profile/listings/new",
  });

  const chooser = page.getByTestId("listing-type-chooser");
  const businessOption = page.getByTestId("listing-type-option-business");
  const continueButton = page.getByTestId("listing-type-chooser-submit");

  await expect(chooser).toBeVisible();
  await expect(businessOption).toBeVisible();
  await businessOption.click();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await expect(page).toHaveURL(/\/profile\/listings\/new\/business$/);
  await expect(page.locator("#name")).toBeVisible();
});

test("listing type chooser hides residential option at the residential limit", async ({
  page,
}) => {
  await signIn(page, {
    email: DONOR_EMAIL,
    redirectTo: "/profile/listings/new?type=host",
  });

  const chooser = page.getByTestId("listing-type-chooser");
  const communityOption = page.getByTestId("listing-type-option-community");
  const continueButton = page.getByTestId("listing-type-chooser-submit");

  await expect(chooser).toBeVisible();
  await expect(page.getByTestId("listing-type-option-residential")).toHaveCount(
    0
  );
  await expect(communityOption).toBeVisible();
  await communityOption.click();
  await expect(continueButton).toBeEnabled();
  await continueButton.click();

  await expect(page).toHaveURL(/\/profile\/listings\/new\/community$/);
});

test("new listing form shows validation feedback when location is missing", async ({
  page,
}) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: "/profile/listings/new/business",
  });
  await expect(page.getByTestId("listing-write-form")).toBeVisible();
  await page.locator("#name").fill("Temporary Demo Business");
  await page
    .locator("#description")
    .fill("A test-only description that leaves location empty on purpose.");
  await page.locator('input[name="legal_agreement"]').check();
  await page.getByTestId("listing-write-submit").click();

  await expect(
    page.getByText(
      /Please select a location\.|Bitte wähle einen Standort aus\.|Selecciona una ubicación\./
    )
  ).toBeVisible();
});

test("listing location search picks a geocoding result", async ({ page }) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: "/profile/listings/new/business",
  });
  await mockMapTilerGeocoding(
    page,
    createMockGeocodingFeature({
      id: "poi.mount-kuring-gai-station",
      text: "Mount Kuring-gai Station",
      placeName:
        "Mount Kuring-gai Station, Mount Kuring-gai, Sydney, Australia",
      placeType: ["poi"],
      context: [
        {
          id: "neighbourhood.mount-kuring-gai",
          text: "Mount Kuring-gai",
        },
        {
          id: "place.sydney",
          text: "Sydney",
        },
      ],
      center: [151.1368, -33.6546],
    })
  );

  await expect(page.getByTestId("listing-write-form")).toBeVisible();
  await page.locator("#country").selectOption("AU");
  const searchInput = page.getByTestId("listing-location-search-input");
  await searchInput.fill("Mount Kuring-gai");
  await expect
    .poll(async () =>
      searchInput.evaluate((element) =>
        Number.parseFloat(getComputedStyle(element).fontSize)
      )
    )
    .toBeGreaterThanOrEqual(16);
  await page.getByRole("option", { name: /Mount Kuring-gai Station/ }).click();

  await expect(
    page.getByRole("option", { name: /Mount Kuring-gai Station/ })
  ).toHaveCount(0);
  await expect(searchInput).toHaveValue("Mount Kuring-gai");
  await expect(page.locator(".maplibregl-canvas")).toBeVisible({
    timeout: 10_000,
  });
  await expect(page.getByText(/Drag the pin/)).toBeVisible();
});

test("listing edit clears a legacy country placeholder to null and round-trips ISO codes", async ({
  page,
}) => {
  const admin = createAdminClient();

  const { error: seedPlaceholderError } = await admin
    .from("listings")
    .update({ country_code: "initial" })
    .eq("slug", BUSINESS_LISTING_SLUG);

  expect(seedPlaceholderError).toBeNull();

  try {
    await signIn(page, {
      email: HOST_EMAIL,
      redirectTo: BUSINESS_LISTING_EDIT_PATH,
    });

    const listingWriteForm = page.getByTestId("listing-write-form");
    await expect(listingWriteForm).toBeVisible();
    await expect(page.locator("#country")).toHaveValue("initial");

    await Promise.all([
      page.waitForURL(/\/listings\/demo-inner-west-cafe\?status=updated$/),
      page.getByTestId("listing-write-submit").click(),
    ]);

    const { data: clearedListing, error: clearedError } = await admin
      .from("listings")
      .select("country_code")
      .eq("slug", BUSINESS_LISTING_SLUG)
      .single();

    expect(clearedError).toBeNull();
    expect(clearedListing?.country_code).toBeNull();

    await page.goto(BUSINESS_LISTING_EDIT_PATH);
    await expect(listingWriteForm).toBeVisible();
    await expect(page.locator("#country")).toHaveValue("initial");
    await page.locator("#country").selectOption("NZ");

    await Promise.all([
      page.waitForURL(/\/listings\/demo-inner-west-cafe\?status=updated$/),
      page.getByTestId("listing-write-submit").click(),
    ]);

    const { data: updatedListing, error: updatedError } = await admin
      .from("listings")
      .select("country_code")
      .eq("slug", BUSINESS_LISTING_SLUG)
      .single();

    expect(updatedError).toBeNull();
    expect(updatedListing?.country_code).toBe("NZ");

    await page.goto(BUSINESS_LISTING_EDIT_PATH);
    await expect(page.locator("#country")).toHaveValue("NZ");
  } finally {
    const { error: restoreError } = await admin
      .from("listings")
      .update({ country_code: "AU" })
      .eq("slug", BUSINESS_LISTING_SLUG);

    expect(restoreError).toBeNull();
  }
});

test("listing edit saves and restores seeded business fields", async ({
  page,
}) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: BUSINESS_LISTING_EDIT_PATH,
  });
  const listingWriteForm = page.getByTestId("listing-write-form");
  await expect(listingWriteForm).toBeVisible();
  const descriptionInput = listingWriteForm.locator("#description").first();
  const visibilityInput = listingWriteForm.locator("#visibility").first();
  const originalDescription = await descriptionInput.inputValue();
  const originalVisibility = await visibilityInput.inputValue();
  const updatedDescription =
    originalDescription === ALTERNATE_BUSINESS_DESCRIPTION
      ? "A demo business listing so local development exercises the multi-listing host views and badges."
      : ALTERNATE_BUSINESS_DESCRIPTION;
  const updatedVisibility = originalVisibility === "true" ? "false" : "true";

  await descriptionInput.fill(updatedDescription);
  await expect(descriptionInput).toHaveValue(updatedDescription);
  await visibilityInput.selectOption(updatedVisibility);
  await delayServerActionRequests(page);

  const submitButton = page.getByTestId("listing-write-submit");
  await expect(submitButton).toHaveAttribute("data-button-width", "full");

  const updateNavigation = page.waitForURL(
    /\/listings\/demo-inner-west-cafe\?status=updated$/
  );
  await submitButton.click();
  await expect(submitButton).toBeDisabled();
  await expect(submitButton).toHaveAttribute("aria-busy", "true");
  await updateNavigation;

  await page.goto(BUSINESS_LISTING_EDIT_PATH);
  await expect(listingWriteForm.locator("#description").first()).toHaveValue(
    updatedDescription
  );
  await expect(listingWriteForm.locator("#visibility").first()).toHaveValue(
    updatedVisibility
  );

  const restoreDescriptionInput = listingWriteForm
    .locator("#description")
    .first();
  await restoreDescriptionInput.fill("");
  await expect(restoreDescriptionInput).toHaveValue("");
  await restoreDescriptionInput.fill(originalDescription);
  await expect(listingWriteForm.locator("#description").first()).toHaveValue(
    originalDescription
  );
  await listingWriteForm
    .locator("#visibility")
    .first()
    .selectOption(originalVisibility);

  await Promise.all([
    page.waitForURL(/\/listings\/demo-inner-west-cafe\?status=updated$/),
    listingWriteForm.getByTestId("listing-write-submit").first().click(),
  ]);

  await page.goto(BUSINESS_LISTING_EDIT_PATH);
  await expect(listingWriteForm.locator("#description").first()).toHaveValue(
    originalDescription
  );
  await expect(listingWriteForm.locator("#visibility").first()).toHaveValue(
    originalVisibility
  );
});

test("dirty listing edit asks before viewing the saved listing", async ({
  page,
}) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: BUSINESS_LISTING_EDIT_PATH,
  });

  const listingWriteForm = page.getByTestId("listing-write-form");
  await expect(listingWriteForm).toBeVisible();
  const descriptionInput = listingWriteForm.locator("#description").first();
  const draftDescription = `Unsaved listing preview draft ${Date.now()}`;
  const viewListingButton = page.getByRole("button", { name: "View listing" });

  await descriptionInput.fill(draftDescription);

  await viewListingButton.click();
  await expect(
    page.getByRole("heading", { name: "Discard changes" })
  ).toBeVisible();
  await expect(
    page.getByText(
      "You have unsaved changes. Are you sure you want to discard them and leave?"
    )
  ).toBeVisible();
  await page.getByRole("button", { name: "No, go back" }).click();

  await expect(page).toHaveURL(/\/profile\/listings\/demo-inner-west-cafe$/);
  await expect(descriptionInput).toHaveValue(draftDescription);

  await viewListingButton.click();
  await page.getByRole("button", { name: "Yes, discard" }).click();

  await expect(page).toHaveURL(/\/listings\/demo-inner-west-cafe$/);
});

test("dirty new listing forms warn before closing or reloading the page", async ({
  page,
}) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: "/profile/listings/new/business",
  });

  await expect(page.getByTestId("listing-write-form")).toBeVisible();
  await page.locator("#name").fill(`Unsaved new listing ${Date.now()}`);

  const dialogPromise = page.waitForEvent("dialog");
  const reloadPromise = page.reload({ waitUntil: "domcontentloaded" });
  const dialog = await dialogPromise;
  expect(dialog.type()).toBe("beforeunload");
  await dialog.accept();
  await reloadPromise;
});

test("clean listing edit views the saved listing without asking", async ({
  page,
}) => {
  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: BUSINESS_LISTING_EDIT_PATH,
  });

  await expect(page.getByTestId("listing-write-form")).toBeVisible();
  const dialogMessages: string[] = [];
  page.on("dialog", async (dialog) => {
    dialogMessages.push(dialog.message());
    await dialog.dismiss();
  });

  await page.getByRole("link", { name: "View listing" }).click();

  await expect(page).toHaveURL(/\/listings\/demo-inner-west-cafe$/);
  expect(dialogMessages).toEqual([]);
});

test("residential listing edit leaves avatar management on the profile page", async ({
  page,
}) => {
  await signIn(page, {
    email: DONOR_EMAIL,
    redirectTo: RESIDENTIAL_LISTING_EDIT_PATH,
  });

  await expect(page.getByTestId("listing-write-form")).toBeVisible();
  await expect(page.getByTestId("avatar-upload-avatars")).toHaveCount(0);
  await expect(page.getByTestId("avatar-upload-listing_avatars")).toHaveCount(
    0
  );
});

test("listing photos open in a dedicated photo tab", async ({ page }) => {
  await page.goto(PUBLIC_MULTI_PHOTO_LISTING_PATH);

  const firstThumbnail = page.getByTestId("listing-photo-thumbnail-1");
  await expect(firstThumbnail).toBeVisible();
  await expect(firstThumbnail).toHaveAttribute("target", "_blank");

  const href = requireHref(await firstThumbnail.getAttribute("href"));
  expect(href).toBe(
    "/listings/demo-marrickville-compost/photos/demo/garden.jpg"
  );

  const photoPage = await page.context().newPage();
  await photoPage.goto(new URL(href, page.url()).toString());
  await expect(photoPage.getByTestId("listing-photo-tab-viewer")).toBeVisible();
  await expect(photoPage.getByRole("navigation")).toHaveCount(0);
  await expect(page).toHaveURL(PUBLIC_MULTI_PHOTO_LISTING_PATH);

  await photoPage.close();
});

test("direct photo page close falls back to the listing page", async ({
  page,
}) => {
  await page.goto("/listings/demo-marrickville-compost/photos/demo/garden.jpg");

  await expect(page.getByTestId("listing-photo-tab-viewer")).toBeVisible();
  await page.getByTestId("listing-photo-tab-viewer-close").click();
  await expect(page).toHaveURL(PUBLIC_MULTI_PHOTO_LISTING_PATH);
});

test("map listing photos open in a dedicated photo tab without disturbing the drawer", async ({
  page,
}) => {
  await page.goto(MAP_MULTI_PHOTO_LISTING_PATH);

  const firstThumbnail = page.getByTestId("listing-photo-thumbnail-1");
  await expect(firstThumbnail).toBeVisible();
  await expect(firstThumbnail).toHaveAttribute("target", "_blank");

  const href = requireHref(await firstThumbnail.getAttribute("href"));
  expect(href).toBe(
    "/listings/demo-marrickville-compost/photos/demo/garden.jpg"
  );

  const photoPage = await page.context().newPage();
  await photoPage.goto(new URL(href, page.url()).toString());
  await expect(photoPage.getByTestId("listing-photo-tab-viewer")).toBeVisible();
  await expect(page).toHaveURL(MAP_MULTI_PHOTO_LISTING_PATH);
  await expect(firstThumbnail).toBeVisible();

  await photoPage.close();
});
