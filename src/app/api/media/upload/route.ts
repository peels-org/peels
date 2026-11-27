import { randomUUID } from "crypto";
import { type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { processMedia } from "@/utils/media/processor";
import {
  MAX_MEDIA_UPLOAD_REQUEST_BYTES,
  getMediaInputFormat,
  getMediaUploadConfig,
  isHeicLikeInput,
  isMediaUploadKind,
} from "@/utils/media/policy";
import { createClient } from "@/utils/supabase/server";
import { createServiceRoleClient } from "@/utils/supabase/service";
import { resolveListingMutationOwner } from "@/utils/listingAccess";
import { reportSupportError } from "@/lib/supportError";

export const runtime = "nodejs";

type ListingPhotoRecord = {
  id: number;
  photos: string[] | null;
};

type ListingAvatarRecord = {
  id: number;
  avatar: string | null;
};

type ProfileAvatarRecord = {
  avatar: string | null;
};

type DeleteMediaRequest = {
  entityId?: unknown;
  kind?: unknown;
  path?: unknown;
};

type PendingMediaUploadRecord = {
  id: number;
};

class InvalidContentLengthError extends Error {}

class RequestBodyTooLargeError extends Error {}

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function jsonSupportError(error: unknown, operation: string) {
  const supportReference = reportSupportError({
    context: { operation },
    error,
    scope: "media",
  });

  return NextResponse.json(
    { error: "Media operation failed", supportReference },
    { status: 500 }
  );
}

function getStringField(formData: FormData, field: string) {
  const value = formData.get(field);
  return typeof value === "string" ? value.trim() : "";
}

function getErrorValue(error: unknown, key: string) {
  return typeof error === "object" && error !== null && key in error
    ? String((error as Record<string, unknown>)[key] ?? "")
    : "";
}

function isMaxPhotosError(error: unknown) {
  const code = getErrorValue(error, "code");
  const message = getErrorValue(error, "message");
  const details = getErrorValue(error, "details");

  return (
    code === "23514" &&
    (`${message} ${details}`.includes("max_photos_per_listing") ||
      `${message} ${details}`.includes("max_pending_listing_photos"))
  );
}

function isMaxPendingListingAvatarsError(error: unknown) {
  const code = getErrorValue(error, "code");
  const message = getErrorValue(error, "message");
  const details = getErrorValue(error, "details");

  return (
    code === "23514" &&
    `${message} ${details}`.includes("max_pending_listing_avatars")
  );
}

async function removeStorageObject({
  bucket,
  path,
  supabase,
}: {
  bucket: string;
  path: string | null | undefined;
  supabase: SupabaseClient;
}) {
  if (!path) return;

  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    console.error(`Failed to remove ${bucket}/${path}:`, error);
  }
}

async function deleteStorageObject({
  bucket,
  path,
  supabase,
}: {
  bucket: string;
  path: string;
  supabase: SupabaseClient;
}) {
  const { error } = await supabase.storage.from(bucket).remove([path]);

  if (error) {
    throw error;
  }
}

async function createPendingMediaUpload({
  bucket,
  kind,
  path,
  supabase,
  userId,
}: {
  bucket: string;
  kind: "listing_avatar" | "listing_photo";
  path: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { error } = await supabase.rpc("create_pending_media_upload", {
    p_bucket: bucket,
    p_kind: kind,
    p_path: path,
    p_user_id: userId,
  });

  if (error) {
    throw error;
  }
}

async function removePendingMediaUploadRecord({
  bucket,
  kind,
  path,
  supabase,
  userId,
}: {
  bucket: string;
  kind: "listing_avatar" | "listing_photo";
  path: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data, error } = await supabase
    .from("pending_media_uploads")
    .delete()
    .eq("bucket", bucket)
    .eq("kind", kind)
    .eq("path", path)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle<PendingMediaUploadRecord>();

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function restorePendingMediaUploadRecord({
  bucket,
  kind,
  path,
  supabase,
  userId,
}: {
  bucket: string;
  kind: "listing_avatar" | "listing_photo";
  path: string;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { error } = await supabase.from("pending_media_uploads").insert({
    bucket,
    kind,
    path,
    user_id: userId,
  });

  if (error && error.code !== "23505") {
    console.error(`Failed to restore pending media ${bucket}/${path}:`, error);
  }
}

async function isPendingMediaReferenced({
  kind,
  path,
  supabase,
}: {
  kind: "listing_avatar" | "listing_photo";
  path: string;
  supabase: SupabaseClient;
}) {
  const query =
    kind === "listing_avatar"
      ? supabase.from("listings").select("id").eq("avatar", path).limit(1)
      : supabase
          .from("listings")
          .select("id")
          .contains("photos", [path])
          .limit(1);

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data ?? []).length > 0;
}

async function deletePendingMediaUpload({
  bucket,
  kind,
  path,
  storageSupabase,
  supabase,
  userId,
}: {
  bucket: string;
  kind: "listing_avatar" | "listing_photo";
  path: string;
  storageSupabase: SupabaseClient;
  supabase: SupabaseClient;
  userId: string;
}) {
  const { data: pendingUpload, error: fetchError } = await supabase
    .from("pending_media_uploads")
    .select("id")
    .eq("bucket", bucket)
    .eq("kind", kind)
    .eq("path", path)
    .eq("user_id", userId)
    .maybeSingle<PendingMediaUploadRecord>();

  if (fetchError) throw fetchError;

  if (!pendingUpload) {
    return false;
  }

  const isReferenced = await isPendingMediaReferenced({
    kind,
    path,
    supabase,
  });

  if (isReferenced) {
    return removePendingMediaUploadRecord({
      bucket,
      kind,
      path,
      supabase,
      userId,
    });
  }

  const pendingRecordRemoved = await removePendingMediaUploadRecord({
    bucket,
    kind,
    path,
    supabase,
    userId,
  });

  if (!pendingRecordRemoved) {
    return false;
  }

  try {
    await deleteStorageObject({
      bucket,
      path,
      supabase: storageSupabase,
    });
  } catch (error) {
    await restorePendingMediaUploadRecord({
      bucket,
      kind,
      path,
      supabase,
      userId,
    });
    throw error;
  }

  return true;
}

async function readFormDataWithSizeLimit(request: Request) {
  const contentLengthHeader = request.headers.get("content-length");

  if (contentLengthHeader) {
    const contentLength = Number(contentLengthHeader);

    if (!Number.isFinite(contentLength) || contentLength <= 0) {
      throw new InvalidContentLengthError();
    }

    if (contentLength > MAX_MEDIA_UPLOAD_REQUEST_BYTES) {
      throw new RequestBodyTooLargeError();
    }

    return request.formData();
  }

  if (!request.body) {
    throw new Error("Missing request body");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let receivedBytes = 0;

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    receivedBytes += value.byteLength;

    if (receivedBytes > MAX_MEDIA_UPLOAD_REQUEST_BYTES) {
      await reader.cancel();
      throw new RequestBodyTooLargeError();
    }

    chunks.push(value);
  }

  return new Request(request.url, {
    body: Buffer.concat(chunks),
    headers: request.headers,
    method: request.method,
  }).formData();
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorised", 401);
  }

  if (
    process.env.PEELS_E2E === "1" &&
    request.headers.get("x-peels-e2e-media-error") === "upload"
  ) {
    return jsonSupportError(
      new Error("Forced unexpected media error for e2e testing"),
      "uploadMedia"
    );
  }

  let storageSupabase;

  try {
    storageSupabase = createServiceRoleClient();
  } catch (error) {
    return jsonSupportError(error, "configureMediaStorage");
  }

  let formData: FormData;

  try {
    formData = await readFormDataWithSizeLimit(request);
  } catch (error) {
    if (error instanceof InvalidContentLengthError) {
      return jsonError("Invalid content length", 400);
    }

    if (error instanceof RequestBodyTooLargeError) {
      return jsonError("Image is too large", 413);
    }

    return jsonError("Invalid form data", 400);
  }

  const kind = getStringField(formData, "kind");

  if (!isMediaUploadKind(kind)) {
    return jsonError("Invalid media kind", 400);
  }

  const file = formData.get("file");

  if (!(file instanceof File)) {
    return jsonError("Missing media file", 400);
  }

  const inputFormat = getMediaInputFormat({
    fileName: file.name,
    mimeType: file.type,
  });

  if (!inputFormat) {
    return jsonError("Unsupported image type", 400);
  }

  if (isHeicLikeInput(inputFormat)) {
    console.warn(
      "Received HEIC/HEIF directly; browser conversion should normally run before upload."
    );
  }

  const entityId = getStringField(formData, "entityId");
  const previousPath = getStringField(formData, "previousPath");
  const config = getMediaUploadConfig(kind);

  if (file.size > config.maxBytes) {
    return jsonError("Image is too large", 413);
  }

  const inputBuffer = Buffer.from(await file.arrayBuffer());

  let processedMedia;

  try {
    processedMedia = await processMedia({
      buffer: inputBuffer,
      kind,
    });
  } catch (error) {
    console.error("Media processing failed:", error);
    return jsonError("Image could not be processed", 422);
  }

  const fileName = `${randomUUID()}.${processedMedia.extension}`;
  let uploaded = false;
  let pendingUploadCreated = false;

  const { error: uploadError } = await storageSupabase.storage
    .from(config.bucket)
    .upload(fileName, processedMedia.buffer, {
      cacheControl: "31536000",
      contentType: processedMedia.contentType,
      upsert: false,
    });

  if (uploadError) {
    return jsonSupportError(uploadError, "uploadMedia");
  }

  uploaded = true;

  try {
    if (!entityId && (kind === "listing_avatar" || kind === "listing_photo")) {
      await createPendingMediaUpload({
        bucket: config.bucket,
        kind,
        path: fileName,
        supabase: storageSupabase,
        userId: user.id,
      });
      pendingUploadCreated = true;

      if (kind === "listing_avatar" && previousPath) {
        await deletePendingMediaUpload({
          bucket: config.bucket,
          kind,
          path: previousPath,
          storageSupabase,
          supabase: storageSupabase,
          userId: user.id,
        });
      }
    }

    if (kind === "profile_avatar") {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("avatar")
        .eq("id", user.id)
        .maybeSingle<ProfileAvatarRecord>();

      if (fetchError) throw fetchError;

      const { error: updateError } = await storageSupabase
        .from("profiles")
        .update({ avatar: fileName })
        .eq("id", user.id);

      if (updateError) throw updateError;

      await removeStorageObject({
        bucket: config.bucket,
        path: profile?.avatar,
        supabase: storageSupabase,
      });
    }

    if (kind === "listing_avatar") {
      if (entityId) {
        const mutationOwner = await resolveListingMutationOwner({
          slug: entityId,
          supabase: storageSupabase,
          userId: user.id,
        });

        if (!mutationOwner) {
          await removeStorageObject({
            bucket: config.bucket,
            path: fileName,
            supabase: storageSupabase,
          });
          return jsonError("Listing not found", 404);
        }

        const { data: listing, error: fetchError } = await storageSupabase
          .from("listings")
          .select("id, avatar")
          .eq("id", mutationOwner.listingId)
          .eq("owner_id", mutationOwner.ownerId)
          .maybeSingle<ListingAvatarRecord>();

        if (fetchError) throw fetchError;

        if (!listing) {
          await removeStorageObject({
            bucket: config.bucket,
            path: fileName,
            supabase: storageSupabase,
          });
          return jsonError("Listing not found", 404);
        }

        const { data: updatedListing, error: updateError } =
          await storageSupabase
            .from("listings")
            .update({ avatar: fileName })
            .eq("id", listing.id)
            .eq("owner_id", mutationOwner.ownerId)
            .select("id")
            .maybeSingle<{ id: number }>();

        if (updateError) throw updateError;

        if (!updatedListing) {
          await removeStorageObject({
            bucket: config.bucket,
            path: fileName,
            supabase: storageSupabase,
          });
          return jsonError("Listing not found", 404);
        }

        await removeStorageObject({
          bucket: config.bucket,
          path: listing.avatar,
          supabase: storageSupabase,
        });
      }
    }

    if (kind === "listing_photo" && entityId) {
      const mutationOwner = await resolveListingMutationOwner({
        slug: entityId,
        supabase: storageSupabase,
        userId: user.id,
      });

      if (!mutationOwner) {
        await removeStorageObject({
          bucket: config.bucket,
          path: fileName,
          supabase: storageSupabase,
        });
        return jsonError("Listing not found", 404);
      }

      const { data: listing, error: updateError } = await storageSupabase
        .rpc("append_listing_photo", {
          p_listing_slug: entityId,
          p_owner_id: mutationOwner.ownerId,
          p_photo: fileName,
        })
        .maybeSingle<ListingPhotoRecord>();

      if (updateError) throw updateError;

      if (!listing) {
        await removeStorageObject({
          bucket: config.bucket,
          path: fileName,
          supabase: storageSupabase,
        });
        return jsonError("Listing not found", 404);
      }
    }
  } catch (error) {
    const maxPhotosError = isMaxPhotosError(error);
    const maxPendingListingAvatarsError =
      isMaxPendingListingAvatarsError(error);

    if (uploaded) {
      await removeStorageObject({
        bucket: config.bucket,
        path: fileName,
        supabase: storageSupabase,
      });
    }

    if (
      pendingUploadCreated &&
      (kind === "listing_avatar" || kind === "listing_photo")
    ) {
      await removePendingMediaUploadRecord({
        bucket: config.bucket,
        kind,
        path: fileName,
        supabase: storageSupabase,
        userId: user.id,
      }).catch((pendingError) => {
        console.error(
          "Failed to roll back pending media upload:",
          pendingError
        );
      });
    }

    if (maxPhotosError) {
      return jsonError("max_photos", 409);
    }

    if (maxPendingListingAvatarsError) {
      return jsonError("max_pending_listing_avatars", 409);
    }

    return jsonSupportError(error, "updateMediaRecord");
  }

  return NextResponse.json({
    bucket: config.bucket,
    contentType: processedMedia.contentType,
    filename: fileName,
    format: processedMedia.format,
  });
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("Unauthorised", 401);
  }

  let storageSupabase;

  try {
    storageSupabase = createServiceRoleClient();
  } catch (error) {
    return jsonSupportError(error, "configureMediaStorage");
  }

  let payload: DeleteMediaRequest;

  try {
    payload = (await request.json()) as DeleteMediaRequest;
  } catch {
    return jsonError("Invalid JSON request body", 400);
  }

  const kind = typeof payload.kind === "string" ? payload.kind : "";
  const path = typeof payload.path === "string" ? payload.path.trim() : "";
  const entityId =
    typeof payload.entityId === "string" ? payload.entityId.trim() : "";

  if (!isMediaUploadKind(kind)) {
    return jsonError("Invalid media kind", 400);
  }

  if (!path) {
    return jsonError("Missing media path", 400);
  }

  const config = getMediaUploadConfig(kind);

  try {
    if (kind === "profile_avatar") {
      const { data: profile, error: fetchError } = await supabase
        .from("profiles")
        .select("avatar")
        .eq("id", user.id)
        .maybeSingle<ProfileAvatarRecord>();

      if (fetchError) throw fetchError;

      if (profile?.avatar !== path) {
        return jsonError("Media not found", 404);
      }

      const { data: updatedProfile, error: updateError } = await storageSupabase
        .from("profiles")
        .update({ avatar: null })
        .eq("id", user.id)
        .eq("avatar", path)
        .select("id")
        .maybeSingle<{ id: string }>();

      if (updateError) throw updateError;

      if (!updatedProfile) {
        return jsonError("Media not found", 404);
      }

      try {
        await deleteStorageObject({
          bucket: config.bucket,
          path,
          supabase: storageSupabase,
        });
      } catch (error) {
        await storageSupabase
          .from("profiles")
          .update({ avatar: path })
          .eq("id", user.id)
          .is("avatar", null);
        throw error;
      }
    }

    if (kind === "listing_avatar") {
      if (!entityId) {
        const deleted = await deletePendingMediaUpload({
          bucket: config.bucket,
          kind,
          path,
          storageSupabase,
          supabase: storageSupabase,
          userId: user.id,
        });

        return deleted
          ? NextResponse.json({ success: true })
          : jsonError("Media not found", 404);
      }

      const mutationOwner = await resolveListingMutationOwner({
        slug: entityId,
        supabase: storageSupabase,
        userId: user.id,
      });

      if (!mutationOwner) {
        return jsonError("Media not found", 404);
      }

      const { data: listing, error: fetchError } = await storageSupabase
        .from("listings")
        .select("id, avatar")
        .eq("id", mutationOwner.listingId)
        .eq("owner_id", mutationOwner.ownerId)
        .maybeSingle<ListingAvatarRecord>();

      if (fetchError) throw fetchError;

      if (!listing || listing.avatar !== path) {
        return jsonError("Media not found", 404);
      }

      const { data: updatedListing, error: updateError } = await storageSupabase
        .from("listings")
        .update({ avatar: null })
        .eq("id", mutationOwner.listingId)
        .eq("owner_id", mutationOwner.ownerId)
        .eq("avatar", path)
        .select("id")
        .maybeSingle<{ id: number }>();

      if (updateError) throw updateError;

      if (!updatedListing) {
        return jsonError("Media not found", 404);
      }

      try {
        await deleteStorageObject({
          bucket: config.bucket,
          path,
          supabase: storageSupabase,
        });
      } catch (error) {
        await storageSupabase
          .from("listings")
          .update({ avatar: path })
          .eq("id", mutationOwner.listingId)
          .eq("owner_id", mutationOwner.ownerId)
          .is("avatar", null);
        throw error;
      }
    }

    if (kind === "listing_photo") {
      let originalPhotos: string[] = [];

      if (!entityId) {
        const deleted = await deletePendingMediaUpload({
          bucket: config.bucket,
          kind,
          path,
          storageSupabase,
          supabase: storageSupabase,
          userId: user.id,
        });

        return deleted
          ? NextResponse.json({ success: true })
          : jsonError("Media not found", 404);
      }

      const mutationOwner = await resolveListingMutationOwner({
        slug: entityId,
        supabase: storageSupabase,
        userId: user.id,
      });

      if (!mutationOwner) {
        return jsonError("Media not found", 404);
      }

      const { data: listing, error: fetchError } = await storageSupabase
        .from("listings")
        .select("id, photos")
        .eq("id", mutationOwner.listingId)
        .eq("owner_id", mutationOwner.ownerId)
        .maybeSingle<ListingPhotoRecord>();

      if (fetchError) throw fetchError;

      if (!listing || !(listing.photos ?? []).includes(path)) {
        return jsonError("Media not found", 404);
      }

      originalPhotos = listing.photos ?? [];

      const { data: updatedListing, error: updateError } =
        await storageSupabase.rpc("remove_listing_photo", {
          p_listing_slug: entityId,
          p_owner_id: mutationOwner.ownerId,
          p_photo: path,
        });

      if (updateError) throw updateError;

      if (!updatedListing?.length) {
        return jsonError("Media not found", 404);
      }

      try {
        await deleteStorageObject({
          bucket: config.bucket,
          path,
          supabase: storageSupabase,
        });
      } catch (error) {
        const { data: restoredListing, error: restoreError } =
          await storageSupabase.rpc(
            "restore_listing_photos_after_failed_delete",
            {
              p_expected_photos: updatedListing[0].photos ?? [],
              p_listing_slug: entityId,
              p_owner_id: mutationOwner.ownerId,
              p_restore_photos: originalPhotos,
            }
          );

        if (restoreError || !restoredListing?.length) {
          console.error("Failed to restore listing photo references:", {
            p_listing_slug: entityId,
            path,
            restoreError,
          });
        }

        throw error;
      }
    }
  } catch (error) {
    return jsonSupportError(error, "deleteMedia");
  }

  return NextResponse.json({ success: true });
}
