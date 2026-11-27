import assert from "node:assert/strict";
import test from "node:test";
import { isSharedOpenDataMediaPath } from "./sharedListingMedia.ts";

test("treats stubs/ paths as shared open-data media", () => {
  assert.equal(
    isSharedOpenDataMediaPath("stubs/city-of-port-phillip.jpg"),
    true
  );
  assert.equal(
    isSharedOpenDataMediaPath("stubs/city-of-port-phillip-bins.jpg"),
    true
  );
});

test("does not treat owner-uploaded media paths as shared", () => {
  assert.equal(
    isSharedOpenDataMediaPath("user-id/listing-avatar-123.jpg"),
    false
  );
  assert.equal(
    isSharedOpenDataMediaPath("user-id/listing-photo-123.jpg"),
    false
  );
});

test("ignores empty paths", () => {
  assert.equal(isSharedOpenDataMediaPath(null), false);
  assert.equal(isSharedOpenDataMediaPath(undefined), false);
  assert.equal(isSharedOpenDataMediaPath(""), false);
});
