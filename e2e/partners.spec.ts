import { expect, test } from "@playwright/test";

test("partners page shows partner and council mention proof", async ({
  page,
}) => {
  await page.goto("/partners", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "Partners", exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Community partners" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Visit LOCCAL" })
  ).toHaveAttribute("href", "https://www.loccal.org.au/");
  await expect(page.getByAltText("LOCCAL logo")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Visit Responsible Cafes" })
  ).toHaveAttribute("href", "https://responsiblecafes.org/");
  await expect(page.getByAltText("Responsible Cafes logo")).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Government mentions" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Waverley Council" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Merri-bek City Council" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Northern Beaches Council" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "State of California" })
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Community highlights" })
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "The Guardian" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Sustainable Gardening Australia" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "The Sustainable Occasion" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "How to Save Our Planet" })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Responsible Cafes" })
  ).toHaveCount(0);
  await expect(page.getByRole("link", { name: "LOCCAL" })).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Share", exact: true })
  ).toHaveAttribute("href", "/share");
});

test("homepage and footer link to partners", async ({ page }) => {
  await page.goto("/", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", { name: "In good company" })
  ).toBeVisible();
  await expect(page.getByAltText("LOCCAL logo")).toBeVisible();
  await expect(page.getByAltText("Responsible Cafes logo")).toBeVisible();
  await expect(page.getByText("Lenawee County, Michigan")).toBeVisible();
  await expect(page.getByText("State of California")).toBeVisible();
  await expect(page.getByText("The Guardian")).toBeHidden();
  await expect(page.getByText("Merri-bek City Council")).toBeVisible();
  await expect(page.getByText("Northern Beaches Council")).toBeVisible();
  await expect(page.getByText("Western Australian Government")).toBeHidden();
  await expect(page.getByText("North Sydney Council")).toBeHidden();
  await expect(
    page.getByRole("link", { name: "See all partners and mentions" })
  ).toHaveAttribute("href", "/partners");
  await expect(
    page
      .locator("#partners-section")
      .getByRole("link", { name: "Partners", exact: true })
  ).toHaveAttribute("href", "/partners");
  await expect(
    page.getByRole("contentinfo").getByRole("link", { name: "Partners" })
  ).toHaveAttribute("href", "/partners");
});
