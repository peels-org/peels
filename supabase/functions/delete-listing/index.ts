import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getBearerToken } from "../_shared/auth.ts";
import { deleteListingMedia } from "../_shared/storage-utils.ts";

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
    status,
  });
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return jsonResponse({ error: "Method not allowed" }, 405);
    }

    let payload: { slug?: unknown };
    try {
      payload = await req.json();
    } catch (_error) {
      return jsonResponse({ error: "Invalid JSON request body" }, 400);
    }

    const { slug } = payload;

    if (!slug || typeof slug !== "string") {
      return jsonResponse({ error: "Missing listing slug" }, 400);
    }

    const accessToken = getBearerToken(req.headers.get("Authorization"));

    if (!accessToken) {
      return jsonResponse({ error: "Missing access token" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceRoleKey) {
      console.error("delete-listing is missing required Supabase env vars");
      return jsonResponse({ error: "Function misconfigured" }, 500);
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(accessToken);

    if (userError || !user) {
      return jsonResponse({ error: "Invalid access token" }, 401);
    }

    const { data: listing, error: listingError } = await supabaseAdmin
      .from("listings")
      .select("id, owner_id, avatar, photos")
      .eq("slug", slug)
      .maybeSingle();

    if (listingError) throw listingError;

    if (!listing) {
      return jsonResponse({ error: "Listing not found" }, 404);
    }

    const isOwner = listing.owner_id === user.id;
    let isAdmin = false;

    if (!isOwner) {
      const { data: profile, error: profileError } = await supabaseAdmin
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;
      isAdmin = profile?.is_admin === true;
    }

    if (!isOwner && !isAdmin) {
      return jsonResponse({ error: "Listing not found" }, 404);
    }

    // Delete all media first
    await deleteListingMedia(supabaseAdmin, listing);

    // Delete the listing
    let deleteQuery = supabaseAdmin
      .from("listings")
      .delete()
      .eq("id", listing.id);

    if (!isAdmin) {
      deleteQuery = deleteQuery.eq("owner_id", user.id);
    }

    const { data: deletedListing, error: deleteError } = await deleteQuery
      .select("id")
      .maybeSingle();

    if (deleteError) throw deleteError;

    if (!deletedListing) {
      return jsonResponse({ error: "Listing not found" }, 404);
    }

    return jsonResponse({ success: true }, 200);
  } catch (error) {
    console.error("Final error:", error);
    return jsonResponse({ error: "Internal server error" }, 500);
  }
});
