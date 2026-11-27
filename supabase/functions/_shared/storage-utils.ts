import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type ListingMedia = {
  avatar: string | null;
  photos: string[] | null;
};

/**
 * Open-data mirrored listings share one avatar path per source under
 * `listing_avatars/stubs/` (also stored on `open_data_sources.default_avatar`).
 * Deleting that object would break every listing still referencing it.
 */
export function isSharedListingAvatarPath(path: string | null | undefined) {
  return typeof path === "string" && path.startsWith("stubs/");
}

export async function isSharedListingAvatar(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<boolean> {
  if (!path) return false;
  if (isSharedListingAvatarPath(path)) return true;

  const { data, error } = await supabase
    .from("open_data_sources")
    .select("id")
    .eq("default_avatar", path)
    .limit(1);

  if (error) {
    console.error("Failed to check shared listing avatar:", error);
    // Fail closed: skip storage deletion rather than wipe a shared asset.
    return true;
  }

  return Boolean(data?.length);
}

export async function deleteStorageObject(
  supabase: SupabaseClient,
  bucket: string,
  path: string
) {
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error(`Error deleting from ${bucket}:`, error);
    throw error;
  }

  console.log(`Deleted from ${bucket}:`, path);
}

export async function deleteListingMedia(
  supabase: SupabaseClient,
  listing: ListingMedia | null
) {
  if (!listing) return;

  const deletePromises = [];

  // Delete avatar if exists and it is not a shared open-data source avatar
  if (listing?.avatar) {
    const sharedAvatar = await isSharedListingAvatar(supabase, listing.avatar);
    if (!sharedAvatar) {
      deletePromises.push(
        deleteStorageObject(supabase, "listing_avatars", listing.avatar)
      );
    } else {
      console.log("Skipping shared open-data listing avatar:", listing.avatar);
    }
  }

  // Delete all photos if they exist
  if (listing?.photos?.length) {
    deletePromises.push(
      Promise.all(
        listing.photos.map((photo) =>
          deleteStorageObject(supabase, "listing_photos", photo)
        )
      )
    );
  }

  await Promise.all(deletePromises);
}
