import test from "node:test";
import assert from "node:assert/strict";

import { resolveListingMutationOwner } from "./listingAccess.ts";

function createFakeSupabase({
  listing,
  isAdmin,
}: {
  listing: { id: number; owner_id: string; slug: string } | null;
  isAdmin?: boolean;
}) {
  return {
    from(table: string) {
      if (table === "listings") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({ data: listing, error: null }),
                };
              },
            };
          },
        };
      }

      if (table === "profiles") {
        return {
          select() {
            return {
              eq() {
                return {
                  maybeSingle: async () => ({
                    data: { is_admin: isAdmin === true },
                    error: null,
                  }),
                };
              },
            };
          },
        };
      }

      throw new Error(`Unexpected table ${table}`);
    },
  };
}

test("resolveListingMutationOwner allows the listing owner", async () => {
  const supabase = createFakeSupabase({
    listing: { id: 12, owner_id: "owner-1", slug: "abc" },
  });

  const result = await resolveListingMutationOwner({
    // @ts-expect-error narrow fake client for unit coverage
    supabase,
    listingId: 12,
    userId: "owner-1",
  });

  assert.deepEqual(result, {
    listingId: 12,
    ownerId: "owner-1",
    slug: "abc",
  });
});

test("resolveListingMutationOwner allows admins and returns the real owner id", async () => {
  const supabase = createFakeSupabase({
    listing: { id: 12, owner_id: "owner-1", slug: "abc" },
    isAdmin: true,
  });

  const result = await resolveListingMutationOwner({
    // @ts-expect-error narrow fake client for unit coverage
    supabase,
    slug: "abc",
    userId: "admin-1",
  });

  assert.deepEqual(result, {
    listingId: 12,
    ownerId: "owner-1",
    slug: "abc",
  });
});

test("resolveListingMutationOwner rejects non-owners who are not admins", async () => {
  const supabase = createFakeSupabase({
    listing: { id: 12, owner_id: "owner-1", slug: "abc" },
    isAdmin: false,
  });

  const result = await resolveListingMutationOwner({
    // @ts-expect-error narrow fake client for unit coverage
    supabase,
    slug: "abc",
    userId: "stranger-1",
  });

  assert.equal(result, null);
});
