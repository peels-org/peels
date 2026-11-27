import type { SupabaseClient } from "@supabase/supabase-js";

type ListingOwnerRow = {
  id: number;
  owner_id: string;
  slug: string | null;
};

export async function isProfileAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .maybeSingle<{ is_admin: boolean | null }>();

  if (error) throw error;

  return data?.is_admin === true;
}

/**
 * Resolve the listing owner for mutations. Owners and admins may act; callers
 * must pass the returned ownerId into ownership-scoped RPCs (not the admin id).
 */
export async function resolveListingMutationOwner({
  listingId,
  slug,
  supabase,
  userId,
}: {
  listingId?: number | null;
  slug?: string | null;
  supabase: SupabaseClient;
  userId: string;
}): Promise<{
  listingId: number;
  ownerId: string;
  slug: string | null;
} | null> {
  if (!listingId && !slug) {
    return null;
  }

  let query = supabase.from("listings").select("id, owner_id, slug");

  if (listingId) {
    query = query.eq("id", listingId);
  } else if (slug) {
    query = query.eq("slug", slug);
  }

  const { data: listing, error } = await query.maybeSingle<ListingOwnerRow>();

  if (error) throw error;
  if (!listing) return null;

  if (listing.owner_id === userId) {
    return {
      listingId: listing.id,
      ownerId: listing.owner_id,
      slug: listing.slug,
    };
  }

  const admin = await isProfileAdmin(supabase, userId);
  if (!admin) {
    return null;
  }

  return {
    listingId: listing.id,
    ownerId: listing.owner_id,
    slug: listing.slug,
  };
}
