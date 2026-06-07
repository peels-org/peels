import {
  defaultAppOrigin,
  getSupportedAppOrigin,
} from "../_shared/app-origin.ts";

type AuthEmailType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication";

const normalizeNextPath = (
  nextPath: string | null | undefined,
  fallbackPath: string
) => {
  if (!nextPath || !nextPath.startsWith("/") || nextPath.startsWith("//")) {
    return fallbackPath;
  }

  try {
    const parsedPath = nextPath.startsWith("/")
      ? new URL(nextPath, defaultAppOrigin)
      : new URL(nextPath);

    if (getSupportedAppOrigin(parsedPath.origin) !== parsedPath.origin) {
      return fallbackPath;
    }
    return `${parsedPath.pathname}${parsedPath.search}${parsedPath.hash}`;
  } catch (_error) {
    return fallbackPath;
  }
};

const getDefaultNextPathByType = (type: AuthEmailType) =>
  type === "recovery" ? "/profile/reset-password" : "/profile";

export const buildAuthConfirmUrl = ({
  email,
  emailActionType,
  locale,
  redirectTo,
  tokenHash,
}: {
  email?: string;
  emailActionType: string;
  locale?: string;
  redirectTo: string;
  tokenHash: string;
}) => {
  const typedAction = (emailActionType ?? "") as AuthEmailType;
  const safeAction: AuthEmailType =
    typedAction === "signup" ||
    typedAction === "invite" ||
    typedAction === "magiclink" ||
    typedAction === "recovery" ||
    typedAction === "email_change" ||
    typedAction === "email" ||
    typedAction === "reauthentication"
      ? typedAction
      : "magiclink";

  const fallbackNextPath = getDefaultNextPathByType(safeAction);
  let appOrigin = defaultAppOrigin;
  let nextPath = fallbackNextPath;

  if (redirectTo) {
    try {
      const redirectUrl = new URL(redirectTo);
      appOrigin = getSupportedAppOrigin(redirectUrl.origin);
      const candidateNextPath =
        redirectUrl.searchParams.get("next") ??
        redirectUrl.searchParams.get("redirect_to");

      if (candidateNextPath) {
        nextPath = normalizeNextPath(candidateNextPath, fallbackNextPath);
      }
    } catch (_error) {
      nextPath = fallbackNextPath;
    }
  }

  const confirmUrl = new URL("/auth/confirm", appOrigin);
  confirmUrl.searchParams.set("token_hash", tokenHash);
  confirmUrl.searchParams.set("type", safeAction);
  confirmUrl.searchParams.set("next", nextPath);
  if (locale) {
    confirmUrl.searchParams.set("locale", locale);
  }
  if (email) {
    confirmUrl.searchParams.set("email", email);
  }

  return confirmUrl.toString();
};
