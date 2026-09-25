// Custom Auth Emails with React Email and Resend
// https://supabase.com/docs/guides/functions/examples/auth-send-email-hook-react-email-resend

import React from "npm:react@18.3.1";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "npm:resend";
import { ResetPasswordEmail } from "../_templates/reset-password-email.tsx";
import { SignUpEmail } from "../_templates/sign-up-email.tsx";
import { EmailChangeEmail } from "../_templates/email-change-email.tsx";
import { MagicLinkEmail } from "../_templates/magic-link-email.tsx";
import { InviteEmail } from "../_templates/invite-email.tsx";
import { ReauthenticationEmail } from "../_templates/reauthentication-email.tsx";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import { getAuthEmailCopy, resolveEmailLocale } from "../_shared/i18n.ts";
import { encodeEmailHtmlCharacterReferences } from "../_shared/email-character-references.ts";

declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

type EmailActionType =
  | "signup"
  | "invite"
  | "magiclink"
  | "recovery"
  | "email_change"
  | "email"
  | "reauthentication";

type HookPayload = {
  user: {
    email: string;
    new_email?: string;
    email_confirmed_at?: string | null;
    created_at?: string;
    user_metadata?: {
      first_name?: string;
      preferred_locale?: string;
    };
  };
  email_data: {
    token?: string;
    token_hash?: string;
    redirect_to?: string;
    email_action_type: string;
  };
};

const RECOVERY_SUPPRESS_WINDOW_MS = 60 * 60 * 1000;

const isEmailConfirmed = (user: HookPayload["user"]) =>
  isNonEmptyString(user.email_confirmed_at);

const isAccountYoungerThan = (
  createdAt: string | undefined,
  windowMs: number
) => {
  if (!isNonEmptyString(createdAt)) {
    return false;
  }

  const createdAtMs = Date.parse(createdAt);
  if (Number.isNaN(createdAtMs)) {
    return false;
  }

  return Date.now() - createdAtMs < windowMs;
};

const shouldSuppressRecoveryEmail = (user: HookPayload["user"]) =>
  !isEmailConfirmed(user) &&
  isAccountYoungerThan(user.created_at, RECOVERY_SUPPRESS_WINDOW_MS);

type PreparedEmail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  emailActionType: EmailActionType;
};

const generalEmailAddress = Deno.env.get("GENERAL_EMAIL_ADDRESS") ?? "";
const resendApiKey = Deno.env.get("RESEND_API_KEY") ?? "";
const hookSecret = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const resend = new Resend(resendApiKey);

const allowedActionTypes = new Set<EmailActionType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
  "email",
  "reauthentication",
]);

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const renderAuthEmailHtml = async (email: React.ReactElement) =>
  encodeEmailHtmlCharacterReferences(await renderAsync(email));

const toErrorShape = (error: unknown) => {
  if (error && typeof error === "object") {
    const maybeError = error as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
    };
    return {
      error_code: isNonEmptyString(maybeError.code)
        ? maybeError.code
        : "unknown_error",
      error_name: isNonEmptyString(maybeError.name) ? maybeError.name : "Error",
      error_message: isNonEmptyString(maybeError.message)
        ? maybeError.message
        : "Unknown error",
    };
  }

  return {
    error_code: "unknown_error",
    error_name: "Error",
    error_message: "Unknown error",
  };
};

const getRecipientDomain = (email: string) => {
  const parts = email.split("@");
  return parts.length === 2 ? parts[1] : "unknown";
};

const logEvent = (event: string, details: Record<string, unknown>) => {
  console.log(
    JSON.stringify({
      event,
      ...details,
    })
  );
};

const parseAndVerify = (payload: string, headers: Headers, wh: Webhook) => {
  const parsed = wh.verify(payload, Object.fromEntries(headers)) as HookPayload;
  const actionType = parsed.email_data?.email_action_type;

  if (
    !isNonEmptyString(actionType) ||
    !allowedActionTypes.has(actionType as EmailActionType)
  ) {
    throw new Error(`Unsupported email_action_type: ${String(actionType)}`);
  }

  if (!isNonEmptyString(parsed.user?.email)) {
    throw new Error("Invalid payload: missing user.email");
  }

  return {
    payload: parsed,
    emailActionType: actionType as EmailActionType,
  };
};

const prepareEmail = async (
  hookPayload: HookPayload,
  emailActionType: EmailActionType
): Promise<PreparedEmail> => {
  const token = hookPayload.email_data?.token ?? "";
  const tokenHash = hookPayload.email_data?.token_hash ?? "";
  const redirectTo = hookPayload.email_data?.redirect_to ?? "";
  const userEmail = hookPayload.user.email;
  const userNewEmail = hookPayload.user.new_email ?? "";
  const firstName = hookPayload.user.user_metadata?.first_name ?? "there";
  const locale = resolveEmailLocale({
    redirectTo,
    preferredLocale: hookPayload.user.user_metadata?.preferred_locale,
  });

  if (
    ["signup", "invite", "magiclink", "recovery", "email_change"].includes(
      emailActionType
    ) &&
    !isNonEmptyString(tokenHash)
  ) {
    throw new Error(
      `Invalid payload: missing token_hash for ${emailActionType}`
    );
  }

  if (
    ["email", "reauthentication"].includes(emailActionType) &&
    !isNonEmptyString(token)
  ) {
    throw new Error(`Invalid payload: missing token for ${emailActionType}`);
  }

  if (emailActionType === "recovery") {
    const copy = getAuthEmailCopy(locale, "recovery");
    return {
      to: userEmail,
      subject: copy.subject,
      html: await renderAuthEmailHtml(
        React.createElement(ResetPasswordEmail, {
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        })
      ),
      text: await renderAsync(
        React.createElement(ResetPasswordEmail, {
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        }),
        { plainText: true }
      ),
      emailActionType,
    };
  }

  if (emailActionType === "signup") {
    const copy = getAuthEmailCopy(locale, "signup");
    return {
      to: userEmail,
      subject: copy.subject,
      html: await renderAuthEmailHtml(
        React.createElement(SignUpEmail, {
          email: userEmail,
          firstName,
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        })
      ),
      text: await renderAsync(
        React.createElement(SignUpEmail, {
          email: userEmail,
          firstName,
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        }),
        { plainText: true }
      ),
      emailActionType,
    };
  }

  if (emailActionType === "email_change") {
    if (!isNonEmptyString(userNewEmail)) {
      throw new Error(
        "Invalid payload: missing user.new_email for email_change"
      );
    }

    const copy = getAuthEmailCopy(locale, "emailChange");
    return {
      to: userNewEmail,
      subject: copy.subject,
      html: await renderAuthEmailHtml(
        React.createElement(EmailChangeEmail, {
          email: userEmail,
          newEmail: userNewEmail,
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        })
      ),
      text: await renderAsync(
        React.createElement(EmailChangeEmail, {
          email: userEmail,
          newEmail: userNewEmail,
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        }),
        { plainText: true }
      ),
      emailActionType,
    };
  }

  if (emailActionType === "magiclink") {
    const copy = getAuthEmailCopy(locale, "magicLink");
    return {
      to: userEmail,
      subject: copy.subject,
      html: await renderAuthEmailHtml(
        React.createElement(MagicLinkEmail, {
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        })
      ),
      text: await renderAsync(
        React.createElement(MagicLinkEmail, {
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        }),
        { plainText: true }
      ),
      emailActionType,
    };
  }

  if (emailActionType === "invite") {
    const copy = getAuthEmailCopy(locale, "invite");
    return {
      to: userEmail,
      subject: copy.subject,
      html: await renderAuthEmailHtml(
        React.createElement(InviteEmail, {
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        })
      ),
      text: await renderAsync(
        React.createElement(InviteEmail, {
          locale,
          supabase_url: supabaseUrl,
          token_hash: tokenHash,
          redirect_to: redirectTo,
          email_action_type: emailActionType,
        }),
        { plainText: true }
      ),
      emailActionType,
    };
  }

  if (emailActionType === "reauthentication") {
    const copy = getAuthEmailCopy(locale, "reauthentication");
    return {
      to: userEmail,
      subject: copy.subject,
      html: await renderAuthEmailHtml(
        React.createElement(ReauthenticationEmail, {
          locale,
          token,
        })
      ),
      text: await renderAsync(
        React.createElement(ReauthenticationEmail, {
          locale,
          token,
        }),
        { plainText: true }
      ),
      emailActionType,
    };
  }

  // "email" type is treated as generic email OTP verification.
  const copy = getAuthEmailCopy(locale, "reauthentication");
  return {
    to: userEmail,
    subject: copy.genericSubject,
    html: await renderAuthEmailHtml(
      React.createElement(ReauthenticationEmail, {
        locale,
        token,
      })
    ),
    text: await renderAsync(
      React.createElement(ReauthenticationEmail, {
        locale,
        token,
      }),
      { plainText: true }
    ),
    emailActionType,
  };
};

addEventListener("unhandledrejection", (event) => {
  logEvent("auth_email_bg_unhandledrejection", {
    reason:
      event.reason instanceof Error
        ? event.reason.message
        : String(event.reason ?? "unknown"),
  });
  event.preventDefault();
});

addEventListener("beforeunload", (event) => {
  logEvent("auth_email_bg_beforeunload", {
    reason: event.detail?.reason ?? "unknown",
  });
});

Deno.serve(async (req) => {
  const hookRequestId = crypto.randomUUID();
  const startedAt = Date.now();

  logEvent("auth_email_hook_received", {
    hook_request_id: hookRequestId,
    method: req.method,
    path: new URL(req.url).pathname,
  });

  if (req.method !== "POST") {
    return json(400, { error: { message: "not allowed" } });
  }

  if (
    !isNonEmptyString(hookSecret) ||
    !isNonEmptyString(resendApiKey) ||
    !isNonEmptyString(generalEmailAddress)
  ) {
    logEvent("auth_email_hook_config_error", {
      hook_request_id: hookRequestId,
      has_hook_secret: isNonEmptyString(hookSecret),
      has_resend_api_key: isNonEmptyString(resendApiKey),
      has_general_email_address: isNonEmptyString(generalEmailAddress),
    });

    return json(500, {
      error: {
        message: "email hook configuration missing",
      },
    });
  }

  try {
    const payload = await req.text();
    const wh = new Webhook(hookSecret);

    const { payload: hookPayload, emailActionType } = parseAndVerify(
      payload,
      req.headers,
      wh
    );

    logEvent("auth_email_hook_verified", {
      hook_request_id: hookRequestId,
      email_action_type: emailActionType,
      duration_ms: Date.now() - startedAt,
    });

    if (
      emailActionType === "recovery" &&
      shouldSuppressRecoveryEmail(hookPayload.user)
    ) {
      logEvent("auth_email_recovery_suppressed", {
        hook_request_id: hookRequestId,
        recipient_domain: getRecipientDomain(hookPayload.user.email),
        reason: "unconfirmed_account_younger_than_one_hour",
        duration_ms: Date.now() - startedAt,
      });

      return json(200, {});
    }

    const sendEmailInBackground = async () => {
      const sendStartedAt = Date.now();

      try {
        const preparedEmail = await prepareEmail(hookPayload, emailActionType);
        const recipientDomain = getRecipientDomain(preparedEmail.to);

        logEvent("auth_email_bg_send_started", {
          hook_request_id: hookRequestId,
          email_action_type: emailActionType,
          recipient_domain: recipientDomain,
        });

        const { error } = await resend.emails.send({
          from: `Peels <${generalEmailAddress}>`,
          to: [preparedEmail.to],
          subject: preparedEmail.subject,
          html: preparedEmail.html,
          text: preparedEmail.text,
        });

        if (error) {
          throw error;
        }

        logEvent("auth_email_bg_send_succeeded", {
          hook_request_id: hookRequestId,
          email_action_type: emailActionType,
          recipient_domain: recipientDomain,
          send_duration_ms: Date.now() - sendStartedAt,
        });
      } catch (error: unknown) {
        const parsedError = toErrorShape(error);
        const recipientDomain = isNonEmptyString(hookPayload.user?.email)
          ? getRecipientDomain(hookPayload.user.email)
          : "unknown";

        logEvent("auth_email_bg_send_failed", {
          hook_request_id: hookRequestId,
          email_action_type: emailActionType,
          recipient_domain: recipientDomain,
          send_duration_ms: Date.now() - sendStartedAt,
          ...parsedError,
        });
      }
    };

    EdgeRuntime.waitUntil(sendEmailInBackground());

    return json(200, {});
  } catch (error: unknown) {
    const parsedError = toErrorShape(error);

    logEvent("auth_email_hook_failed", {
      hook_request_id: hookRequestId,
      duration_ms: Date.now() - startedAt,
      ...parsedError,
    });

    return json(401, {
      error: {
        http_code: parsedError.error_code,
        message: parsedError.error_message,
      },
    });
  }
});
