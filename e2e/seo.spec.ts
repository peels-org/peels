import { expect, test } from "@playwright/test";
import { DONOR_EMAIL, SEEDED_THREAD_ID, signIn } from "./helpers";

const LISTING_PATH = "/listings/demo-marrickville-compost";
const MAP_LISTING_PATH = "/map?listing=demo-marrickville-compost";
const RESIDENTIAL_LISTING_PATH = "/listings/demo-newtown-worm-farm";
const SITE_URL = "https://www.peels.org";
const DEFAULT_OG_IMAGE_PATTERN =
  /^https:\/\/www\.peels\.org\/opengraph-image\.jpg/;

async function getMetaDescription(page: import("@playwright/test").Page) {
  return page.locator('head meta[name="description"]').getAttribute("content");
}

async function getListingJsonLdScripts(page: import("@playwright/test").Page) {
  return page.locator('script[type="application/ld+json"]').allTextContents();
}

async function expectSharedSocialMetadata(
  page: import("@playwright/test").Page,
  canonicalPath: string
) {
  const canonicalUrl =
    canonicalPath === "/" ? SITE_URL : `${SITE_URL}${canonicalPath}`;

  await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
    "href",
    canonicalUrl
  );
  await expect(page.locator('head meta[property="og:url"]')).toHaveAttribute(
    "content",
    canonicalUrl
  );
  await expect(page.locator('head meta[property="og:image"]')).toHaveAttribute(
    "content",
    DEFAULT_OG_IMAGE_PATTERN
  );
  await expect(page.locator('head meta[name="twitter:card"]')).toHaveAttribute(
    "content",
    "summary_large_image"
  );
  await expect(page.locator('head meta[name="twitter:image"]')).toHaveAttribute(
    "content",
    DEFAULT_OG_IMAGE_PATTERN
  );
}

type ListingJsonLd = {
  "@context"?: unknown;
  "@type"?: unknown;
  "@id"?: string;
  "@graph"?: unknown;
  mainEntity?: Array<{
    name?: string;
    acceptedAnswer?: {
      text?: string;
    };
  }>;
  about?: {
    address?: unknown;
    additionalProperty?: unknown;
    geo?: unknown;
    image?: unknown;
  };
};

function parseJsonLdScripts(scripts: string[]) {
  return scripts.map((script) => JSON.parse(script) as ListingJsonLd);
}

async function newLocalePage(
  browser: import("@playwright/test").Browser,
  locale: string,
  acceptLanguage: string
) {
  const baseURL = test.info().project.use.baseURL as string | undefined;
  const context = await browser.newContext({
    baseURL,
    locale,
    extraHTTPHeaders: {
      "Accept-Language": acceptLanguage,
    },
  });
  const page = await context.newPage();

  return { context, page };
}

test("homepage emits object-shaped site JSON-LD", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const jsonLdScripts = await getListingJsonLdScripts(page);
  const siteJsonLd = parseJsonLdScripts(jsonLdScripts);
  const organizationJsonLd = siteJsonLd.find(
    (data) => data["@type"] === "Organization"
  );
  const websiteJsonLd = siteJsonLd.find((data) => data["@type"] === "WebSite");

  expect(organizationJsonLd).toEqual(
    expect.objectContaining({
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "Peels",
    })
  );
  expect(websiteJsonLd).toEqual(
    expect.objectContaining({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Peels",
    })
  );
});

test("homepage exposes canonical social metadata and one primary H1", async ({
  page,
}) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(
    "Peels: Find a home for your food scraps, wherever you are"
  );
  await expectSharedSocialMetadata(page, "/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText([
    "Find a home for your food scraps, wherever you are",
  ]);

  const emptyLinks = await page.locator("a").evaluateAll((links) =>
    links
      .filter((link) => {
        const text = link.textContent?.trim();
        const ariaLabel = link.getAttribute("aria-label")?.trim();
        const imageAlts = Array.from(link.querySelectorAll("img"))
          .map((image) => image.getAttribute("alt")?.trim())
          .filter(Boolean);

        return !text && !ariaLabel && imageAlts.length === 0;
      })
      .map((link) => link.outerHTML)
  );

  expect(emptyLinks).toEqual([]);
});

test("public static pages expose canonical social metadata", async ({
  page,
}) => {
  for (const { path, title } of [
    { path: "/map", title: "Map · Peels" },
    { path: "/newsletter", title: "Newsletter · Peels" },
    { path: "/contact", title: "Contact · Peels" },
    { path: "/partners", title: "Partners · Peels" },
    { path: "/share", title: "Share · Peels" },
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });

    await expect(page).toHaveTitle(title);
    await expectSharedSocialMetadata(page, path);
  }
});

test("homepage emits summary FAQPage JSON-LD", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  const jsonLdScripts = await getListingJsonLdScripts(page);
  const faqJsonLd = parseJsonLdScripts(jsonLdScripts).find(
    (data) => data["@type"] === "FAQPage"
  );
  const questions = faqJsonLd?.mainEntity?.map((entity) => entity.name) ?? [];

  expect(questions).toEqual(
    expect.arrayContaining([
      "What is Peels?",
      "How do I find a compost drop-off near me?",
      "Can I compost food scraps if I don’t have a garden or compost bin?",
      "Can businesses use Peels to donate food scraps?",
      "I’m not comfortable sharing my address. Can I still participate?",
    ])
  );
  expect(questions).not.toContain("Who maintains Peels?");
});

test("public listing pages expose crawlable listing metadata", async ({
  page,
}) => {
  await page.goto(LISTING_PATH, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle("Marrickville Neighbourhood Compost · Peels");
  await expectSharedSocialMetadata(page, LISTING_PATH);

  const description = await getMetaDescription(page);
  expect(description).toContain(
    "Marrickville Neighbourhood Compost accepts food scraps for composting"
  );

  const jsonLdScripts = await getListingJsonLdScripts(page);
  expect(
    jsonLdScripts.some(
      (script) =>
        script.includes('"@type":"WebPage"') &&
        script.includes("Marrickville Neighbourhood Compost")
    )
  ).toBeTruthy();

  const listingJsonLd = parseJsonLdScripts(jsonLdScripts).find(
    (data) =>
      data["@id"] ===
      "https://www.peels.org/listings/demo-marrickville-compost#webpage"
  );
  expect(listingJsonLd?.about?.additionalProperty).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        name: "Accepted food scraps",
        value: expect.stringContaining("Fruit and vegetable scraps"),
      }),
      expect.objectContaining({
        name: "Items not accepted",
        value: expect.stringContaining("Plastic bags"),
      }),
    ])
  );
});

test("anonymous residential listing pages expose indexable public content without identity or media", async ({
  page,
}) => {
  await page.goto(RESIDENTIAL_LISTING_PATH, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle("Private Host · Peels");
  await expectSharedSocialMetadata(page, RESIDENTIAL_LISTING_PATH);
  await expect(page.locator('head meta[name="robots"]')).toHaveCount(0);

  const description = await getMetaDescription(page);
  expect(description).toContain(
    "Private Host accepts food scraps for composting in Newtown, Australia"
  );
  expect(description).not.toContain("Newtown Balcony Worm Farm");

  await expect(
    page.getByRole("heading", { name: "Private Host" })
  ).toBeVisible();
  await expect(
    page.getByText("Resident of Newtown", { exact: true })
  ).toBeVisible();
  await expect(page.getByText("A small residential setup")).toBeVisible();
  await expect(page.getByText("Fruit scraps", { exact: true })).toBeVisible();
  await expect(page.getByText("Paper towels", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Crushed egg shells", { exact: true })
  ).toBeVisible();

  const pageHtml = await page.content();
  for (const privateText of [
    "Newtown Balcony Worm Farm",
    "9a0c62fc-bf50-4f45-ba6c-5b9051c2712a",
    "demo/sunflowers.jpg",
    "Riley",
  ]) {
    expect(pageHtml).not.toContain(privateText);
  }

  const jsonLdScripts = await getListingJsonLdScripts(page);
  const listingJsonLd = parseJsonLdScripts(jsonLdScripts).find(
    (data) =>
      data["@id"] ===
      "https://www.peels.org/listings/demo-newtown-worm-farm#webpage"
  );

  expect(listingJsonLd).toEqual(
    expect.objectContaining({
      "@type": "WebPage",
      name: "Private Host",
    })
  );
  expect(listingJsonLd?.about?.address).toBeUndefined();
  expect(listingJsonLd?.about?.geo).toBeUndefined();
  expect(listingJsonLd?.about?.image).toBeUndefined();
  expect(listingJsonLd?.about?.additionalProperty).toBeUndefined();
});

test("public listing pages localise Spanish SEO metadata", async ({
  browser,
}) => {
  const { context, page } = await newLocalePage(
    browser,
    "es-MX",
    "es-MX,es;q=0.9,en;q=0.8"
  );

  try {
    await page.goto(LISTING_PATH, { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle(
      "Marrickville Neighbourhood Compost · Peels"
    );
    await expect(page.locator('head link[rel="canonical"]')).toHaveAttribute(
      "href",
      /\/listings\/demo-marrickville-compost$/
    );

    const description = await getMetaDescription(page);
    expect(description).toContain(
      "Marrickville Neighbourhood Compost acepta restos de comida para compostar"
    );
    expect(description).not.toContain("helps people compost food scraps");

    const jsonLdScripts = await getListingJsonLdScripts(page);
    expect(
      jsonLdScripts.some(
        (script) =>
          script.includes('"inLanguage":"es"') &&
          script.includes("acepta restos de comida para compostar")
      )
    ).toBeTruthy();

    const listingJsonLd = parseJsonLdScripts(jsonLdScripts).find(
      (data) =>
        data["@id"] ===
        "https://www.peels.org/listings/demo-marrickville-compost#webpage"
    );
    expect(listingJsonLd?.about?.additionalProperty).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "Restos de comida aceptados",
        }),
        expect.objectContaining({
          name: "Elementos no aceptados",
        }),
      ])
    );
  } finally {
    await context.close();
  }
});

test("anonymous residential listing pages localise the private-host teaser", async ({
  browser,
}) => {
  const { context, page } = await newLocalePage(
    browser,
    "es-MX",
    "es-MX,es;q=0.9,en;q=0.8"
  );

  try {
    await page.goto(RESIDENTIAL_LISTING_PATH, {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(page).toHaveTitle("Anfitrión privado · Peels");
    await expect(
      page.getByRole("heading", { name: "Anfitrión privado" })
    ).toBeVisible();

    const description = await getMetaDescription(page);
    expect(description).toContain(
      "Anfitrión privado acepta restos de comida para compostar"
    );
    expect(description).not.toContain("Private Host");
  } finally {
    await context.close();
  }
});

test("public listing pages localise Brazilian Portuguese SEO metadata", async ({
  browser,
}) => {
  const { context, page } = await newLocalePage(
    browser,
    "pt-BR",
    "pt-BR,pt;q=0.9,en;q=0.8"
  );

  try {
    await page.goto(LISTING_PATH, { waitUntil: "domcontentloaded" });

    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");

    const description = await getMetaDescription(page);
    expect(description).toContain(
      "Marrickville Neighbourhood Compost aceita restos de comida para compostagem"
    );
    expect(description).not.toContain("helps people compost food scraps");
  } finally {
    await context.close();
  }
});

test("map listing URLs canonicalise to the static listing sibling", async ({
  page,
}) => {
  await page.goto(MAP_LISTING_PATH, { waitUntil: "domcontentloaded" });

  await expectSharedSocialMetadata(page, LISTING_PATH);
});

test("map listing URLs localise metadata without changing canonical", async ({
  browser,
}) => {
  const { context, page } = await newLocalePage(
    browser,
    "es-MX",
    "es-MX,es;q=0.9,en;q=0.8"
  );

  try {
    await page.goto(MAP_LISTING_PATH, { waitUntil: "domcontentloaded" });

    await expectSharedSocialMetadata(page, LISTING_PATH);

    const description = await getMetaDescription(page);
    expect(description).toContain(
      "Marrickville Neighbourhood Compost acepta restos de comida para compostar"
    );
  } finally {
    await context.close();
  }
});

test("map listing drawer localises anonymous residential fallback copy", async ({
  browser,
}) => {
  const { context, page } = await newLocalePage(
    browser,
    "es-MX",
    "es-MX,es;q=0.9,en;q=0.8"
  );

  try {
    await page.goto("/map?listing=demo-newtown-worm-farm", {
      waitUntil: "domcontentloaded",
    });

    await expect(page.locator("html")).toHaveAttribute("lang", "es");
    await expect(
      page.getByRole("heading", { level: 1, name: "Anfitrión privado" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { level: 3, name: "Anfitrión privado" })
    ).toBeVisible({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: "Private Host" })
    ).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("auth utility pages are noindex and omitted from the sitemap", async ({
  page,
  request,
}) => {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle("Sign in · Peels");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex,\s*follow/
  );
  await expectSharedSocialMetadata(page, "/sign-in");

  const sitemap = await request.get("/sitemap.xml");
  expect(sitemap.ok()).toBeTruthy();

  const sitemapXml = await sitemap.text();
  expect(sitemapXml).not.toContain("/sign-in");
  expect(sitemapXml).not.toContain("/sign-up");
  expect(sitemapXml).toContain("/listings/demo-marrickville-compost");
});

test("signed-in private pages keep noindex metadata and route-specific titles", async ({
  page,
}) => {
  await signIn(page, { email: DONOR_EMAIL, redirectTo: "/profile" });

  await expect(page).toHaveTitle("Profile · Peels");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex,\s*follow/
  );
  await expectSharedSocialMetadata(page, "/profile");

  await page.goto("/chats", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveTitle("Chats · Peels");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex,\s*follow/
  );
  await expectSharedSocialMetadata(page, "/chats");

  await page.goto(`/chats/${SEEDED_THREAD_ID}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveTitle("Avery · Chats · Peels");
  await expect(page.locator('head meta[name="robots"]')).toHaveAttribute(
    "content",
    /noindex,\s*follow/
  );
  await expectSharedSocialMetadata(page, `/chats/${SEEDED_THREAD_ID}`);
});

test("contact page emits FAQPage JSON-LD for visible contact questions", async ({
  page,
}) => {
  await page.goto("/contact", { waitUntil: "domcontentloaded" });

  const jsonLdScripts = await getListingJsonLdScripts(page);
  const faqJsonLd = parseJsonLdScripts(jsonLdScripts).find(
    (data) => data["@type"] === "FAQPage"
  );
  const questions = faqJsonLd?.mainEntity?.map((entity) => entity.name) ?? [];

  expect(questions).toEqual(
    expect.arrayContaining([
      "How do I manage which emails I receive?",
      "How is Peels different to ShareWaste?",
      "Who maintains Peels?",
      "I represent a government or institution. How can we get involved?",
    ])
  );
  expect(
    faqJsonLd?.mainEntity?.some((entity) =>
      entity.acceptedAnswer?.text?.includes(
        "The newsletter is separate and optional"
      )
    )
  ).toBeTruthy();
});

test("robots.txt allows crawling and advertises the sitemap", async ({
  request,
}) => {
  const response = await request.get("/robots.txt");
  expect(response.ok()).toBeTruthy();

  const robots = await response.text();
  expect(robots).toContain("Allow: /");
  expect(robots).toContain("Sitemap: https://www.peels.org/sitemap.xml");
});
