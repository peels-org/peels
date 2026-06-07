export const defaultAppOrigin = "https://www.peels.app";

const supportedAppOrigins = new Set([
  defaultAppOrigin,
  "https://www.peels.org",
]);

export const getSupportedAppOrigin = (origin: string | null | undefined) => {
  if (!origin) {
    return defaultAppOrigin;
  }

  return supportedAppOrigins.has(origin) ? origin : defaultAppOrigin;
};

export const getPublicSiteUrl = () => {
  const configuredOrigin = Deno.env.get("PEELS_PUBLIC_SITE_URL")?.trim();

  if (!configuredOrigin) {
    return defaultAppOrigin;
  }

  try {
    return getSupportedAppOrigin(new URL(configuredOrigin).origin);
  } catch (_error) {
    return defaultAppOrigin;
  }
};
