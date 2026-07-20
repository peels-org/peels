import { createClient } from "@supabase/supabase-js";
import { expect, type Page, test } from "@playwright/test";
import {
  HOST_EMAIL,
  SEEDED_PASSWORD,
  createAdminClient,
  parseLocalSupabaseEnv,
  signIn,
} from "./helpers";

const BUSINESS_LISTING_SLUG = "demo-inner-west-cafe";
const BUSINESS_LISTING_EDIT_PATH = `/profile/listings/${BUSINESS_LISTING_SLUG}`;
const HOST_USER_ID = "2c9ae20c-2469-4e60-84b3-39268697717c";

async function uploadTestMedia(
  page: Page,
  {
    entityId,
    kind,
    previousPath,
  }: {
    entityId?: string;
    kind: "listing_avatar" | "listing_photo";
    previousPath?: string;
  }
) {
  return page.evaluate(
    async ({ entityId, kind, previousPath }) => {
      const canvas = document.createElement("canvas");
      canvas.width = 20;
      canvas.height = 20;
      const context = canvas.getContext("2d");

      if (!context) {
        throw new Error("Could not create canvas context");
      }

      context.fillStyle = "#155b4a";
      context.fillRect(0, 0, 20, 20);

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) resolve(result);
          else reject(new Error("Could not create test image"));
        }, "image/png");
      });
      const formData = new FormData();
      formData.append("kind", kind);

      if (entityId) {
        formData.append("entityId", entityId);
      }

      if (previousPath) {
        formData.append("previousPath", previousPath);
      }

      formData.append(
        "file",
        new File([blob], "upload-route-test.png", { type: "image/png" })
      );

      const response = await fetch("/api/media/upload", {
        body: formData,
        method: "POST",
      });
      const data = await response.json();

      return {
        data,
        ok: response.ok,
        status: response.status,
      };
    },
    { entityId, kind, previousPath }
  );
}

async function uploadTestListingPhoto(page: Page) {
  return uploadTestMedia(page, {
    entityId: BUSINESS_LISTING_SLUG,
    kind: "listing_photo",
  });
}

test("public listing media URLs still work without exposing bucket listings", async ({
  page,
}) => {
  const env = parseLocalSupabaseEnv();
  const publicResponse = await page.request.get(
    `${env.API_URL}/storage/v1/object/public/listing_photos/demo/garden.jpg`
  );

  expect(publicResponse.ok()).toBe(true);

  const listResponse = await page.request.post(
    `${env.API_URL}/storage/v1/object/list/listing_photos`,
    {
      data: { limit: 10, prefix: "" },
      headers: {
        apikey: env.ANON_KEY,
        Authorization: `Bearer ${env.ANON_KEY}`,
      },
    }
  );
  const listedObjects = (await listResponse.json()) as Array<{ name: string }>;

  expect(listResponse.ok()).toBe(true);
  expect(listedObjects).toEqual([]);

  const client = createClient(env.API_URL, env.ANON_KEY);
  const { error: signInError } = await client.auth.signInWithPassword({
    email: HOST_EMAIL,
    password: SEEDED_PASSWORD,
  });

  expect(signInError).toBeNull();

  const { error: directUploadError } = await client.storage
    .from("listing_photos")
    .upload(`direct-upload-${Date.now()}.jpg`, new Blob(["test"]), {
      contentType: "image/jpeg",
    });

  expect(directUploadError).not.toBeNull();

  const {
    data: { user },
  } = await client.auth.getUser();
  expect(user).not.toBeNull();

  const { error: forgedPendingInsertError } = await client
    .from("pending_media_uploads")
    .insert({
      bucket: "listing_avatars",
      kind: "listing_avatar",
      path: "demo/brewery.jpg",
      user_id: user!.id,
    });

  expect(forgedPendingInsertError).not.toBeNull();

  const { error: directProfileAvatarUpdateError } = await client
    .from("profiles")
    .update({ avatar: "demo/brewery.jpg" })
    .eq("id", user!.id);

  expect(directProfileAvatarUpdateError).not.toBeNull();

  const { error: directListingMediaUpdateError } = await client
    .from("listings")
    .update({
      avatar: "demo/brewery.jpg",
      photos: ["demo/garden.jpg"],
    })
    .eq("slug", BUSINESS_LISTING_SLUG);

  expect(directListingMediaUpdateError).not.toBeNull();

  const { error: directAppendPhotoError } = await client.rpc(
    "append_listing_photo",
    {
      p_listing_slug: BUSINESS_LISTING_SLUG,
      p_owner_id: user!.id,
      p_photo: "demo/garden.jpg",
    }
  );

  expect(directAppendPhotoError).not.toBeNull();

  const { error: directPendingMediaError } = await client.rpc(
    "create_pending_media_upload",
    {
      p_bucket: "listing_photos",
      p_kind: "listing_photo",
      p_path: "demo/garden.jpg",
      p_user_id: user!.id,
    }
  );

  expect(directPendingMediaError).not.toBeNull();

  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: "/profile",
  });

  let pendingPhoto: string | null = null;
  let pendingAvatar: string | null = null;

  try {
    const pendingPhotoUpload = await uploadTestMedia(page, {
      kind: "listing_photo",
    });
    pendingPhoto = pendingPhotoUpload.data.filename;

    if (!pendingPhoto) {
      throw new Error("Pending photo upload did not return a filename");
    }

    const pendingPhotoDelete = await page.evaluate(async (filename) => {
      const response = await fetch("/api/media/upload", {
        body: JSON.stringify({
          kind: "listing_photo",
          path: filename,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });

      return {
        ok: response.ok,
        status: response.status,
      };
    }, pendingPhoto);

    expect(pendingPhotoDelete.ok).toBe(true);
    const deletedPendingPhoto = pendingPhoto;
    pendingPhoto = null;

    const { error: pendingPhotoDownloadError } = await createAdminClient()
      .storage.from("listing_photos")
      .download(deletedPendingPhoto);

    expect(pendingPhotoDownloadError).not.toBeNull();

    const pendingAvatarUpload = await uploadTestMedia(page, {
      kind: "listing_avatar",
      previousPath: "demo/brewery.jpg",
    });
    pendingAvatar = pendingAvatarUpload.data.filename;

    if (!pendingAvatar) {
      throw new Error("Pending avatar upload did not return a filename");
    }

    const { error: seededAvatarDownloadError } = await createAdminClient()
      .storage.from("listing_avatars")
      .download("demo/brewery.jpg");

    expect(seededAvatarDownloadError).toBeNull();

    const pendingAvatarDelete = await page.evaluate(async (filename) => {
      const response = await fetch("/api/media/upload", {
        body: JSON.stringify({
          kind: "listing_avatar",
          path: filename,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });

      return {
        ok: response.ok,
        status: response.status,
      };
    }, pendingAvatar);

    expect(pendingAvatarDelete.ok).toBe(true);
    pendingAvatar = null;
  } finally {
    const admin = createAdminClient();

    if (pendingPhoto) {
      await admin.storage.from("listing_photos").remove([pendingPhoto]);
    }

    if (pendingAvatar) {
      await admin.storage.from("listing_avatars").remove([pendingAvatar]);
    }
  }
});

test("pending listing photo uploads are capped before listing creation", async ({
  page,
}) => {
  const admin = createAdminClient();
  const uploadedFilenames: string[] = [];

  const { data: stalePendingPhotos } = await admin
    .from("pending_media_uploads")
    .select("path")
    .eq("bucket", "listing_photos")
    .eq("kind", "listing_photo")
    .eq("user_id", HOST_USER_ID);
  const stalePendingPhotoPaths = (stalePendingPhotos ?? []).map(
    (row) => row.path
  );

  await admin
    .from("pending_media_uploads")
    .delete()
    .eq("bucket", "listing_photos")
    .eq("kind", "listing_photo")
    .eq("user_id", HOST_USER_ID);

  if (stalePendingPhotoPaths.length > 0) {
    await admin.storage.from("listing_photos").remove(stalePendingPhotoPaths);
  }

  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: "/profile/listings/new/business",
  });

  try {
    for (let index = 0; index < 5; index += 1) {
      const uploadResult = await uploadTestMedia(page, {
        kind: "listing_photo",
      });

      expect(uploadResult.ok).toBe(true);
      uploadedFilenames.push(uploadResult.data.filename);
    }

    const rejectedUpload = await uploadTestMedia(page, {
      kind: "listing_photo",
    });

    expect(rejectedUpload.ok).toBe(false);
    expect(rejectedUpload.status).toBe(409);
    expect(rejectedUpload.data.error).toBe("max_photos");

    const { count, error } = await admin
      .from("pending_media_uploads")
      .select("id", { count: "exact", head: true })
      .eq("bucket", "listing_photos")
      .eq("kind", "listing_photo")
      .eq("user_id", HOST_USER_ID);

    expect(error).toBeNull();
    expect(count).toBe(5);
  } finally {
    if (uploadedFilenames.length > 0) {
      await admin
        .from("pending_media_uploads")
        .delete()
        .eq("bucket", "listing_photos")
        .eq("kind", "listing_photo")
        .eq("user_id", HOST_USER_ID)
        .in("path", uploadedFilenames);

      await admin.storage.from("listing_photos").remove(uploadedFilenames);
    }
  }
});

test("listing photo uploads are normalised to JPEG and removable", async ({
  page,
}) => {
  const admin = createAdminClient();
  let uploadedFilename: string | null = null;

  await signIn(page, {
    email: HOST_EMAIL,
    redirectTo: BUSINESS_LISTING_EDIT_PATH,
  });

  try {
    const uploadResult = await uploadTestListingPhoto(page);

    expect(uploadResult.ok).toBe(true);
    expect(uploadResult.data.contentType).toBe("image/jpeg");
    expect(uploadResult.data.filename).toMatch(/\.jpg$/);
    uploadedFilename = uploadResult.data.filename;

    const { data: listing, error } = await admin
      .from("listings")
      .select("photos")
      .eq("slug", BUSINESS_LISTING_SLUG)
      .single();

    expect(error).toBeNull();
    expect(listing?.photos).toContain(uploadedFilename);

    const deleteResult = await page.evaluate(async (filename) => {
      const response = await fetch("/api/media/upload", {
        body: JSON.stringify({
          entityId: "demo-inner-west-cafe",
          kind: "listing_photo",
          path: filename,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "DELETE",
      });
      const data = await response.json();

      return {
        data,
        ok: response.ok,
        status: response.status,
      };
    }, uploadedFilename);

    expect(deleteResult.ok).toBe(true);

    const { data: deletedListing, error: deletedListingError } = await admin
      .from("listings")
      .select("photos")
      .eq("slug", BUSINESS_LISTING_SLUG)
      .single();

    expect(deletedListingError).toBeNull();
    expect(deletedListing?.photos ?? []).not.toContain(uploadedFilename);
    uploadedFilename = null;
  } finally {
    if (uploadedFilename) {
      const { data: listing } = await admin
        .from("listings")
        .select("photos")
        .eq("slug", BUSINESS_LISTING_SLUG)
        .single();
      const photos = (listing?.photos ?? []).filter(
        (photo: string) => photo !== uploadedFilename
      );

      await admin
        .from("listings")
        .update({ photos })
        .eq("slug", BUSINESS_LISTING_SLUG);
      await admin.storage.from("listing_photos").remove([uploadedFilename]);
    }
  }
});

test("listing photo uploads return max_photos when the listing is full", async ({
  page,
}) => {
  const admin = createAdminClient();
  const { data: originalListing, error: originalListingError } = await admin
    .from("listings")
    .select("photos")
    .eq("slug", BUSINESS_LISTING_SLUG)
    .single();

  expect(originalListingError).toBeNull();

  const fullPhotoSet = [
    "limit/one.jpg",
    "limit/two.jpg",
    "limit/three.jpg",
    "limit/four.jpg",
    "limit/five.jpg",
  ];

  try {
    const { error: updateError } = await admin
      .from("listings")
      .update({ photos: fullPhotoSet })
      .eq("slug", BUSINESS_LISTING_SLUG);

    expect(updateError).toBeNull();

    await signIn(page, {
      email: HOST_EMAIL,
      redirectTo: BUSINESS_LISTING_EDIT_PATH,
    });

    const uploadResult = await uploadTestListingPhoto(page);

    expect(uploadResult.ok).toBe(false);
    expect(uploadResult.status).toBe(409);
    expect(uploadResult.data.error).toBe("max_photos");

    const { data: listing, error } = await admin
      .from("listings")
      .select("photos")
      .eq("slug", BUSINESS_LISTING_SLUG)
      .single();

    expect(error).toBeNull();
    expect(listing?.photos).toEqual(fullPhotoSet);
  } finally {
    await admin
      .from("listings")
      .update({ photos: originalListing?.photos ?? null })
      .eq("slug", BUSINESS_LISTING_SLUG);
  }
});
