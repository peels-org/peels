import test from "node:test";
import assert from "node:assert/strict";

import {
  appendLocaleParam,
  appendSuccessParam,
  normaliseNextPath,
} from "./authRedirects.ts";

test("normaliseNextPath accepts same-app relative paths", () => {
  assert.equal(
    normaliseNextPath("/profile?tab=settings", "/map"),
    "/profile?tab=settings"
  );
});

test("normaliseNextPath accepts absolute peels.org app URLs", () => {
  assert.equal(
    normaliseNextPath("https://peels.org/listings/QE4QxdJ4y5YE", "/map"),
    "/listings/QE4QxdJ4y5YE"
  );
  assert.equal(
    normaliseNextPath("https://www.peels.org/listings/QE4QxdJ4y5YE", "/map"),
    "/listings/QE4QxdJ4y5YE"
  );
});

test("normaliseNextPath rejects external and malformed redirect targets", () => {
  assert.equal(
    normaliseNextPath("https://example.com/profile", "/map"),
    "/map"
  );
  assert.equal(normaliseNextPath("profile", "/map"), "/map");
  assert.equal(normaliseNextPath("//example.com/profile", "/map"), "/map");
  assert.equal(
    normaliseNextPath("https://www.peels.org//example.com/profile", "/map"),
    "/map"
  );
});

test("appendSuccessParam keeps redirects path-only", () => {
  assert.equal(
    appendSuccessParam("https://www.peels.org/profile", "email_change"),
    "/profile?success=email_change"
  );
});

test("appendLocaleParam keeps redirects path-only", () => {
  assert.equal(
    appendLocaleParam("https://www.peels.org/profile", "de"),
    "/profile?locale=de"
  );
});
