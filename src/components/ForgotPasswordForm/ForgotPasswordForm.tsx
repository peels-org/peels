"use client";

import { useCallback, useMemo, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";

import { forgotPasswordAction } from "@/app/actions";
import Button from "@/components/Button";
import Field from "@/components/Field";
import Form from "@/components/Form";
import FormMessage from "@/components/FormMessage";
import Input from "@/components/Input";
import InputHint from "@/components/InputHint";
import Label from "@/components/Label";
import { useTurnstileToken } from "@/components/SignUpForm/useTurnstileToken";
import SupportErrorMessage from "@/components/SupportErrorMessage";
import type { FormSubmitEvent } from "@/types/events";
import { isTurnstileEnabled } from "@/utils/utils";

type ForgotPasswordFormProps = {
  defaultEmail?: string;
  error?: string;
  supportReference?: string;
};

export default function ForgotPasswordForm({
  defaultEmail,
  error,
  supportReference,
}: ForgotPasswordFormProps) {
  const t = useTranslations();
  const timeoutMessage = t("Auth.turnstile.timeout");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const turnstileEnabled = isTurnstileEnabled();
  const failedMessage = useCallback(
    (code: string) => t("Auth.turnstile.failed", { code }),
    [t]
  );
  const turnstile = useTurnstileToken({
    enabled: turnstileEnabled,
    expiredMessage: t("Auth.turnstile.expired"),
    failedMessage,
    notReadyMessage: t("Auth.turnstile.notReady"),
    siteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITEKEY ?? "",
    timeoutMessage,
    unsupportedMessage: t("Auth.turnstile.unsupported"),
  });
  const captchaError = turnstile.error;
  const isBusy = isSubmitting || turnstile.isWaitingForToken;
  const fieldErrorCount = Number(Boolean(captchaError));
  const hasFieldErrors = fieldErrorCount > 0;

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    turnstile.resetError();

    const formData = new FormData(event.currentTarget);
    let tokenToUse: string | undefined;
    const searchParams = new URLSearchParams(window.location.search);
    const shouldSkipTurnstile = searchParams.get("e2e_skip_turnstile") === "1";

    try {
      tokenToUse = await turnstile.requestToken();
    } catch {
      if (!shouldSkipTurnstile) {
        return;
      }
    }

    if (!tokenToUse && shouldSkipTurnstile) {
      formData.append("e2e_skip_turnstile", "1");
    }

    setIsSubmitting(true);

    try {
      if (tokenToUse) {
        formData.append("captcha_token", tokenToUse);
      }

      await forgotPasswordAction(formData);
    } catch (error) {
      console.error("Forgot password error:", error);
      setIsSubmitting(false);
    }
  };

  const turnstileContainerStyle = useMemo(
    () =>
      turnstile.isInteractive || captchaError
        ? undefined
        : ({
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clipPath: "inset(50%)",
          } as const),
    [captchaError, turnstile.isInteractive]
  );

  return (
    <Form
      onSubmit={handleSubmit}
      aria-busy={isBusy || undefined}
      data-testid="forgot-password-form"
    >
      <Field>
        <Label htmlFor="email">{t("Common.email")}</Label>
        <Input
          name="email"
          type="email"
          placeholder="you@example.com"
          required={true}
          defaultValue={defaultEmail}
          disabled={isBusy}
        />
      </Field>

      {turnstileEnabled && (
        <Field style={turnstileContainerStyle}>
          <Turnstile {...turnstile.turnstileProps} />
          {captchaError && (
            <InputHint
              variant="error"
              data-testid="forgot-password-captcha-error"
            >
              {captchaError}
            </InputHint>
          )}
        </Field>
      )}

      {(error || hasFieldErrors) && (
        <FormMessage
          message={{
            error: error ? (
              supportReference ? (
                <SupportErrorMessage
                  message={error}
                  pageUrl="/forgot-password"
                  scope="auth"
                  supportReference={supportReference}
                />
              ) : (
                error
              )
            ) : hasFieldErrors ? (
              t("Errors.validationSummary", { count: fieldErrorCount })
            ) : (
              t("Errors.generic")
            ),
          }}
        />
      )}

      <Button
        type="submit"
        variant="primary"
        width="full"
        loading={isBusy}
        loadingText={
          turnstile.isWaitingForToken
            ? t("Status.verifying")
            : t("Status.emailing")
        }
        disabled={isBusy}
        data-testid="forgot-password-submit"
      >
        {t("Actions.emailLink")}
      </Button>
    </Form>
  );
}
