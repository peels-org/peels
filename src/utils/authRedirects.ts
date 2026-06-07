import {
  defaultAppOrigin,
  isSupportedAppOrigin,
} from "../config/appOrigins.ts";
import { defaultLocale, type Locale, normaliseLocale } from "../i18n/config.ts";

export const SUPABASE_EMAIL_AUTH_TYPES = new Set([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
] as const);

export type SupabaseEmailAuthType =
  (typeof SUPABASE_EMAIL_AUTH_TYPES extends Set<infer T> ? T : never) & string;

export const isSupportedEmailAuthType = (
  type: string | null | undefined
): type is SupabaseEmailAuthType =>
  typeof type === "string" &&
  SUPABASE_EMAIL_AUTH_TYPES.has(type as SupabaseEmailAuthType);

export const getDefaultNextPathByType = (type: string | null | undefined) => {
  if (type === "recovery") {
    return "/profile/reset-password";
  }

  return "/profile";
};

export const normaliseNextPath = (
  candidatePath: string | null | undefined,
  fallbackPath: string
) => {
  if (!candidatePath || candidatePath.startsWith("//")) {
    return fallbackPath;
  }

  try {
    const parsedPath = candidatePath.startsWith("/")
      ? new URL(candidatePath, defaultAppOrigin)
      : new URL(candidatePath);

    if (!isSupportedAppOrigin(parsedPath.origin)) {
      return fallbackPath;
    }

    return `${parsedPath.pathname}${parsedPath.search}${parsedPath.hash}`;
  } catch (_error) {
    return fallbackPath;
  }
};

export const appendSuccessParam = (path: string, successValue: string) => {
  const normalisedPath = normaliseNextPath(path, "/profile");
  const url = new URL(normalisedPath, defaultAppOrigin);
  url.searchParams.set("success", successValue);
  return `${url.pathname}${url.search}${url.hash}`;
};

export const getLocaleFromSearchParams = (
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
) => {
  if (searchParams instanceof URLSearchParams) {
    return normaliseLocale(searchParams.get("locale"));
  }

  const rawLocale = searchParams.locale;
  if (Array.isArray(rawLocale)) {
    return normaliseLocale(rawLocale[0]);
  }

  return normaliseLocale(rawLocale ?? null);
};

export const appendLocaleParam = (path: string, locale: Locale) => {
  const normalisedPath = normaliseNextPath(path, "/profile");
  const url = new URL(normalisedPath, defaultAppOrigin);
  url.searchParams.set("locale", locale);
  return `${url.pathname}${url.search}${url.hash}`;
};

export const resolveAuthLocale = (
  requestedLocale: string | null | undefined
): Locale => normaliseLocale(requestedLocale) ?? defaultLocale;
