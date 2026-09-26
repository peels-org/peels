import assert from "node:assert/strict";
import test from "node:test";
import {
  getClientIpFromHeaders,
  isTorExitIp,
  parseTorExitList,
  resetTorExitCacheForTests,
} from "./torExit.ts";

test("parseTorExitList ignores comments and blank lines", () => {
  const ips = parseTorExitList(`# comment
185.220.100.252

172.105.20.12
# another
`);
  assert.equal(ips.size, 2);
  assert.equal(ips.has("185.220.100.252"), true);
  assert.equal(ips.has("172.105.20.12"), true);
});

test("getClientIpFromHeaders prefers x-forwarded-for first hop", () => {
  const headers = new Headers({
    "x-real-ip": "185.220.100.252",
    "x-forwarded-for": "1.2.3.4, 5.6.7.8",
  });
  assert.equal(getClientIpFromHeaders(headers), "1.2.3.4");
});

test("getClientIpFromHeaders falls back to x-real-ip", () => {
  const headers = new Headers({
    "x-real-ip": "185.220.100.252",
  });
  assert.equal(getClientIpFromHeaders(headers), "185.220.100.252");
});

test("isTorExitIp returns false when IP is missing", async () => {
  assert.equal(await isTorExitIp(null), false);
  assert.equal(await isTorExitIp(""), false);
});

test("isTorExitIp matches against a stubbed exit list", async () => {
  resetTorExitCacheForTests();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response("185.220.100.252\n172.105.20.12\n", {
      status: 200,
      headers: { "Content-Type": "text/plain" },
    })) as typeof fetch;

  try {
    assert.equal(await isTorExitIp("185.220.100.252"), true);
    assert.equal(await isTorExitIp("8.8.8.8"), false);
  } finally {
    globalThis.fetch = originalFetch;
    resetTorExitCacheForTests();
  }
});

test("isTorExitIp fails open and backs off when the list fetch errors", async () => {
  resetTorExitCacheForTests();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;
  globalThis.fetch = (async () => {
    fetchCount += 1;
    throw new Error("network down");
  }) as typeof fetch;

  try {
    assert.equal(await isTorExitIp("185.220.100.252"), false);
    assert.equal(await isTorExitIp("185.220.100.252"), false);
    assert.equal(fetchCount, 1);
  } finally {
    globalThis.fetch = originalFetch;
    resetTorExitCacheForTests();
  }
});
