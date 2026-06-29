export const defaultAppOrigin = "https://www.peels.org";

export const supportedAppOrigins = [
  defaultAppOrigin,
  "https://www.peels.app",
] as const;

export function isSupportedAppOrigin(origin: string) {
  return supportedAppOrigins.includes(
    origin as (typeof supportedAppOrigins)[number]
  );
}
