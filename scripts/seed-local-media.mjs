import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..");

const bucketConfigs = {
  avatars: {
    public: true,
    fileSizeLimit: "10MiB",
    allowedMimeTypes: ["image/png", "image/jpeg"],
    sourceDir: path.join(repoRoot, "supabase", "storage", "avatars"),
  },
  listing_avatars: {
    public: true,
    fileSizeLimit: "10MiB",
    allowedMimeTypes: ["image/png", "image/jpeg"],
    sourceDir: path.join(repoRoot, "supabase", "storage", "listing_avatars"),
  },
  listing_photos: {
    public: true,
    fileSizeLimit: "25MiB",
    allowedMimeTypes: ["image/jpeg"],
    sourceDir: path.join(repoRoot, "supabase", "storage", "listing_photos"),
  },
};

function parseStatusEnv() {
  const output = execFileSync("supabase", ["status", "-o", "env"], {
    cwd: repoRoot,
    encoding: "utf8",
  });

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((env, line) => {
      const separatorIndex = line.indexOf("=");
      if (separatorIndex === -1) return env;

      const key = line.slice(0, separatorIndex);
      const rawValue = line.slice(separatorIndex + 1).trim();
      const value = rawValue.replace(/^"(.*)"$/, "$1");
      env[key] = value;
      return env;
    }, {});
}

function assertLocalApiUrl(apiUrl) {
  if (!apiUrl) {
    throw new Error("Missing API_URL from `supabase status -o env`.");
  }

  const hostname = new URL(apiUrl).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error(
      `Refusing to seed demo media into non-local Supabase API: ${apiUrl}`
    );
  }
}

function walkFiles(sourceDir, currentDir = sourceDir) {
  return readdirSync(currentDir, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      return walkFiles(sourceDir, absolutePath);
    }

    if (!entry.isFile()) {
      return [];
    }

    return {
      absolutePath,
      objectPath: path
        .relative(sourceDir, absolutePath)
        .split(path.sep)
        .join("/"),
    };
  });
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".png") return "image/png";
  if (extension === ".webp") return "image/webp";

  return "application/octet-stream";
}

function normalizeFileSizeLimit(fileSizeLimit) {
  return fileSizeLimit.replace("MiB", "MB").replace("KiB", "KB");
}

async function ensureBucket(supabase, bucketName, bucketConfig) {
  const normalizedConfig = {
    public: bucketConfig.public,
    fileSizeLimit: normalizeFileSizeLimit(bucketConfig.fileSizeLimit),
    allowedMimeTypes: bucketConfig.allowedMimeTypes,
  };

  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw listError;
  }

  const existingBucket = buckets?.find(
    (bucket) => bucket.id === bucketName || bucket.name === bucketName
  );

  if (!existingBucket) {
    const { error: createError } = await supabase.storage.createBucket(
      bucketName,
      normalizedConfig
    );

    if (createError) {
      throw createError;
    }

    return;
  }

  const { error: updateError } = await supabase.storage.updateBucket(
    bucketName,
    normalizedConfig
  );

  if (updateError) {
    throw updateError;
  }
}

async function uploadBucketObjects(supabase, bucketName, bucketConfig) {
  await ensureBucket(supabase, bucketName, bucketConfig);

  const files = walkFiles(bucketConfig.sourceDir);

  for (const file of files) {
    const body = readFileSync(file.absolutePath);
    const contentType = getContentType(file.absolutePath);

    const { error } = await supabase.storage
      .from(bucketName)
      .upload(file.objectPath, body, {
        contentType,
        upsert: true,
      });

    if (error) {
      throw new Error(
        `Failed to upload ${bucketName}/${file.objectPath}: ${error.message}`
      );
    }

    const size = Math.round(statSync(file.absolutePath).size / 1024);
    console.log(`Uploaded ${bucketName}/${file.objectPath} (${size} KB)`);
  }
}

async function main() {
  const env = parseStatusEnv();
  assertLocalApiUrl(env.API_URL);

  if (!env.SERVICE_ROLE_KEY) {
    throw new Error("Missing SERVICE_ROLE_KEY from `supabase status -o env`.");
  }

  const supabase = createClient(env.API_URL, env.SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  for (const [bucketName, bucketConfig] of Object.entries(bucketConfigs)) {
    await uploadBucketObjects(supabase, bucketName, bucketConfig);
  }

  const listingPhotoFixture = path.join(
    repoRoot,
    "supabase",
    "storage",
    "listing_photos",
    "demo",
    "garden.jpg"
  );
  const listingPhotoBody = readFileSync(listingPhotoFixture);

  for (const photoName of ["one", "two", "three", "four", "five"]) {
    const objectPath = `limit/${photoName}.jpg`;
    const { error } = await supabase.storage
      .from("listing_photos")
      .upload(objectPath, listingPhotoBody, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      throw new Error(
        `Failed to upload listing_photos/${objectPath}: ${error.message}`
      );
    }

    console.log(`Uploaded listing_photos/${objectPath}`);
  }

  console.log("Local demo media seeding complete.");
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
