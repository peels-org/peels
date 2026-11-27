import type { SupabaseClient } from "@supabase/supabase-js";

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
