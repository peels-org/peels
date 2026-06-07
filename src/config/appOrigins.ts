export const defaultAppOrigin = "https://www.peels.app";

export const supportedAppOrigins = [
  defaultAppOrigin,
  "https://www.peels.org",
] as const;

export function isSupportedAppOrigin(origin: string) {
  return supportedAppOrigins.includes(
    origin as (typeof supportedAppOrigins)[number]
  );
}
