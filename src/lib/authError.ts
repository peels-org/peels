type AuthErrorLike = {
  code?: string;
  message?: string;
};

export type SignInErrorKind =
  | "emailNotConfirmed"
  | "invalidCredentials"
  | "rateLimited";

export function classifySignInError(
  error: AuthErrorLike
): SignInErrorKind | null {
  switch (error.code) {
    case "email_not_confirmed":
      return "emailNotConfirmed";
    case "invalid_credentials":
      return "invalidCredentials";
    case "over_request_rate_limit":
      return "rateLimited";
    default:
      return null;
  }
}

export function isAccountExistsError(error: AuthErrorLike) {
  if (error.code === "email_exists" || error.code === "user_already_exists") {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("already registered") || message.includes("already exists")
  );
}

export function isWeakPasswordError(error: AuthErrorLike) {
  if (error.code === "weak_password") {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return (
    message.includes("password is known to be weak") ||
    message.includes("password should be at least")
  );
}

export function isAuthHookTimeout(error: AuthErrorLike) {
  if (
    error.code === "hook_timeout" ||
    error.code === "hook_timeout_after_retry"
  ) {
    return true;
  }

  const message = error.message ?? "";
  return (
    message.includes("Error running hook URI") ||
    message.includes("Failed to reach hook within maximum time")
  );
}
