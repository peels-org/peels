import assert from "node:assert/strict";
import test from "node:test";
import { isSharedListingAvatarPath } from "./sharedListingAvatar.ts";

test("treats stubs/ paths as shared open-data avatars", () => {
  assert.equal(
    isSharedListingAvatarPath("stubs/city-of-port-phillip.jpg"),
    true
  );
});

test("does not treat owner-uploaded avatar paths as shared", () => {
  assert.equal(
    isSharedListingAvatarPath("user-id/listing-avatar-123.jpg"),
    false
  );
});

test("ignores empty paths", () => {
  assert.equal(isSharedListingAvatarPath(null), false);
  assert.equal(isSharedListingAvatarPath(undefined), false);
  assert.equal(isSharedListingAvatarPath(""), false);
});
