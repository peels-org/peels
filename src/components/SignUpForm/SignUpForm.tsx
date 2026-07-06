"use client";

import { useCallback, useMemo, useState } from "react";
import { Turnstile } from "@marsidev/react-turnstile";
import { useTranslations } from "next-intl";

import { signUpAction } from "@/app/actions";
import Button from "@/components/Button";
import CheckboxCluster from "@/components/CheckboxCluster";
import CheckboxRow from "@/components/CheckboxRow";
import EncodedEmailLink from "@/components/EncodedEmailLink";
import Field from "@/components/Field";
import Form from "@/components/Form";
import FormMessage from "@/components/FormMessage";
import Input from "@/components/Input";
import InputHint from "@/components/InputHint";
import Label from "@/components/Label";
import LegalAgreement from "@/components/LegalAgreement";
import { useTurnstileToken } from "@/components/SignUpForm/useTurnstileToken";
import { siteConfig } from "@/config/site";
import { FIELD_CONFIGS, validateFirstName } from "@/lib/formValidation";
import type { FormSubmitEvent } from "@/types/events";
import { getStoredAttributionParams } from "@/utils/attributionUtils";
import { isTurnstileEnabled } from "@/utils/utils";

interface SignUpFormProps {
  defaultValues?: {
    first_name?: string;
    email?: string;
    newsletter_preference?: boolean;
  };
  error?: string;
}

export default function SignUpForm({
  defaultValues = {},
  error,
}: SignUpFormProps) {
  const t = useTranslations();
  const timeoutMessage = t("Auth.turnstile.timeout");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [firstNameError, setFirstNameError] = useState<string | null>(null);
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
  const fieldErrorCount =
    Number(Boolean(firstNameError)) + Number(Boolean(captchaError));
  const hasFieldErrors = fieldErrorCount > 0;

  const handleSubmit = async (event: FormSubmitEvent) => {
    event.preventDefault();

    if (isBusy) {
      return;
    }

    setFirstNameError(null);
    turnstile.resetError();

    const formData = new FormData(event.currentTarget);
    const validation = validateFirstName(
      formData.get("first_name")?.toString()
    );

    if (!validation.isValid) {
      switch (validation.error) {
        case "empty":
          setFirstNameError(t("Errors.emptyName"));
          break;
        case "tooShort":
          setFirstNameError(t("Errors.firstNameTooShort"));
          break;
        case "tooLong":
          setFirstNameError(t("Errors.firstNameTooLong"));
          break;
        case "invalidChars":
          setFirstNameError(t("Errors.firstNameInvalidChars"));
          break;
        case "forbiddenContent":
        case "reserved":
          setFirstNameError(t("Errors.firstNameNotAllowed"));
          break;
        default:
          setFirstNameError(t("Errors.generic"));
      }
      return;
    }

    let tokenToUse: string | undefined;

    try {
      tokenToUse = await turnstile.requestToken();
    } catch {
      return;
    }

    setIsSubmitting(true);

    try {
      if (tokenToUse) {
        formData.append("captcha_token", tokenToUse);
      }

      const utmParams = getStoredAttributionParams();
      Object.entries(utmParams).forEach(([key, value]) => {
        if (value && typeof value === "string") formData.append(key, value);
      });

      await signUpAction(formData);
    } catch (error) {
      console.error("Sign up error:", error);
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
      data-testid="sign-up-form"
    >
      <Field>
        <Label htmlFor="first_name">{t("Auth.signUp.firstName")}</Label>
        <Input
          name="first_name"
          {...FIELD_CONFIGS.firstName}
          defaultValue={defaultValues.first_name}
          error={firstNameError}
          disabled={isBusy}
        />
        {firstNameError && (
          <InputHint variant="error" data-testid="sign-up-first-name-error">
            {firstNameError}
          </InputHint>
        )}
      </Field>

      <Field>
        <Label htmlFor="email">{t("Common.email")}</Label>
        <Input
          name="email"
          {...FIELD_CONFIGS.email}
          defaultValue={defaultValues.email}
          disabled={isBusy}
        />
      </Field>

      <Field>
        <Label htmlFor="password">{t("Common.password")}</Label>
        <Input
          name="password"
          {...FIELD_CONFIGS.password}
          placeholder={t("Auth.signUp.newPassword")}
          disabled={isBusy}
        />
      </Field>

      <CheckboxCluster>
        <LegalAgreement required={true} disabled={isBusy} />
        <CheckboxRow
          name="newsletter_preference"
          required={false}
          defaultChecked={defaultValues.newsletter_preference}
          disabled={isBusy}
        >
          {t("Auth.signUp.newsletterOptIn")}
        </CheckboxRow>
      </CheckboxCluster>

      {turnstileEnabled && (
        <Field style={turnstileContainerStyle}>
          <Turnstile {...turnstile.turnstileProps} />
          {captchaError && (
            <InputHint variant="error" data-testid="sign-up-captcha-error">
              {captchaError}
            </InputHint>
          )}
        </Field>
      )}

      {(error || hasFieldErrors) && (
        <FormMessage
          message={{
            error: error
              ? t.rich("Auth.signUp.errorWithSupport", {
                  error: error.endsWith(".") ? error : `${error}.`,
                  link: (chunks) => (
                    <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                      {chunks}
                    </EncodedEmailLink>
                  ),
                })
              : hasFieldErrors
                ? t("Errors.validationSummary", { count: fieldErrorCount })
                : t("Errors.generic"),
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
            : t("Status.signingUp")
        }
        disabled={isBusy}
        data-testid="sign-up-submit"
      >
        {t("Actions.signUp")}
      </Button>
    </Form>
  );
}
