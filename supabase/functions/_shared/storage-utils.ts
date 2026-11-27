import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

type ListingMedia = {
  avatar: string | null;
  photos: string[] | null;
};

/**
 * Open-data mirrored listings share media under `stubs/` (avatars and photos).
 * Avatars are also recorded on `open_data_sources.default_avatar`.
 * Deleting those objects would break every listing still referencing them.
 */
export function isSharedOpenDataMediaPath(path: string | null | undefined) {
  return typeof path === "string" && path.startsWith("stubs/");
}

export async function isSharedListingAvatar(
  supabase: SupabaseClient,
  path: string | null | undefined
): Promise<boolean> {
  if (!path) return false;
  if (isSharedOpenDataMediaPath(path)) return true;

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

  // Delete photos that are not shared open-data stub assets
  if (listing?.photos?.length) {
    deletePromises.push(
      Promise.all(
        listing.photos.map(async (photo) => {
          if (isSharedOpenDataMediaPath(photo)) {
            console.log("Skipping shared open-data listing photo:", photo);
            return;
          }

          await deleteStorageObject(supabase, "listing_photos", photo);
        })
      )
    );
  }

  await Promise.all(deletePromises);
}
