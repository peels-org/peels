import { expect, test } from "@playwright/test";

test("share page presents the sharing resources download", async ({ page }) => {
  await page.goto("/share", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Spread the word", exact: true })
  ).toBeVisible();
  await expect(page).toHaveTitle(/Share · Peels/);
  const downloadLink = page.getByRole("link", { name: "Download everything" });

  await expect(downloadLink).toHaveAttribute("href", /share-peels\.zip/);
  await expect(downloadLink).toHaveAttribute("target", "_blank");
  await expect(downloadLink).toHaveAttribute("rel", "noopener");
  await expect(
    page.getByRole("heading", { name: "Digital tiles" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Print assets" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Workshop resources" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Inside the ZIP" })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "Copy examples" })
  ).toBeVisible();
  await expect(page.getByText("Shortest", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      "Peels connects folks with food scraps to those who compost."
    )
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Partners page" })
  ).toHaveAttribute("href", "/partners");
});

test("promo-kit redirects to share", async ({ page }) => {
  const redirectResponse = await page.request.get("/promo-kit", {
    maxRedirects: 0,
  });

  expect(redirectResponse.status()).toBe(308);
  expect(redirectResponse.headers().location).toMatch(/\/share$/);

  await page.goto("/promo-kit", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveURL(/\/share$/);
  await expect(
    page.getByRole("heading", { name: "Spread the word", exact: true })
  ).toBeVisible();
});

test("contact page combines email and FAQ", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { level: 1, name: "Contact", exact: true })
  ).toBeVisible();
  await expect(page.locator("#contact")).toBeVisible();
  await expect(page.getByText("Email us at")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Copy address" })
  ).toBeVisible();

  const contactHeading = page.locator("#contact");
  const usingPeelsHeading = page.getByRole("heading", { name: "Using Peels" });
  await expect(contactHeading).toBeVisible();
  await expect(usingPeelsHeading).toBeVisible();

  const contactBox = await contactHeading.boundingBox();
  const faqBox = await usingPeelsHeading.boundingBox();
  expect(contactBox?.y).toBeLessThan(faqBox?.y ?? 0);

  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Contact" })
  ).toHaveAttribute("href", "/contact");
});

test("help redirects to contact", async ({ page }) => {
  const redirectResponse = await page.request.get("/help?utm_source=old-help", {
    maxRedirects: 0,
  });

  expect(redirectResponse.status()).toBe(308);
  expect(redirectResponse.headers().location).toMatch(
    /\/contact\?utm_source=old-help$/
  );

  await page.goto("/help?utm_source=old-help", {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL(/\/contact\?utm_source=old-help$/);
  await expect(
    page.getByRole("heading", { level: 1, name: "Contact", exact: true })
  ).toBeVisible();
});

test("support redirects to contact", async ({ page }) => {
  const redirectResponse = await page.request.get(
    "/support?address=support&utm_source=old-support",
    {
      maxRedirects: 0,
    }
  );

  expect(redirectResponse.status()).toBe(308);
  expect(redirectResponse.headers().location).toMatch(
    /\/contact\?address=support&utm_source=old-support$/
  );

  await page.goto("/support?address=support&utm_source=old-support", {
    waitUntil: "domcontentloaded",
  });

  await expect(page).toHaveURL(
    /\/contact\?address=support&utm_source=old-support$/
  );
  await expect(
    page.getByRole("heading", { level: 1, name: "Contact", exact: true })
  ).toBeVisible();
});

test("contact promotion FAQ links to share", async ({ page }) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });

  await page.getByText("How can I promote Peels to my community?").click();

  await expect(page.getByRole("link", { name: "Share page" })).toHaveAttribute(
    "href",
    "/share"
  );
});
