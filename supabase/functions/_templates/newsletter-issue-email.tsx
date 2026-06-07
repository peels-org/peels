import * as React from "npm:react";
import EmailBody from "./components/EmailBody.tsx";
import EmailButton from "./components/EmailButton.tsx";
import EmailHr from "./components/EmailHr.tsx";
import EmailLink from "./components/EmailLink.tsx";
import EmailParagraph from "./components/EmailParagraph.tsx";
import {
  getCurrentNewsletterIssue,
  getNewsletterEmailCopy,
  getNewsletterIssueUrl,
} from "../_shared/newsletter.ts";
import type { SupportedLocale } from "../_shared/i18n.ts";
import { getPublicSiteUrl } from "../_shared/app-origin.ts";

interface NewsletterIssueEmailProps {
  locale: SupportedLocale;
  recipientName: string;
  externalAudience: boolean;
}

const getGreeting = (locale: SupportedLocale, recipientName: string) => {
  switch (locale) {
    case "es":
      return `Hola ${recipientName},`;
    case "de":
      return `Hallo ${recipientName},`;
    case "pt-BR":
      return `Olá ${recipientName},`;
    case "fr":
      return `Bonjour ${recipientName},`;
    default:
      return `Hi ${recipientName},`;
  }
};

export const NewsletterIssueEmail = ({
  locale,
  recipientName = "there",
  externalAudience,
}: NewsletterIssueEmailProps) => {
  const copy = getNewsletterEmailCopy(locale);
  const issue = getCurrentNewsletterIssue(locale);
  const issueUrl = getNewsletterIssueUrl(locale);
  const profileUrl = `${getPublicSiteUrl()}/profile`;

  return (
    <EmailBody
      previewText={copy.preview}
      headingText={copy.heading}
      footerText={
        <>
          {externalAudience ? (
            <>
              {copy.footerExternalPrefix}
              <EmailLink href="{{{RESEND_UNSUBSCRIBE_URL}}}">
                {copy.footerExternalLink}
              </EmailLink>
              {copy.footerExternalSuffix}
            </>
          ) : (
            <>
              {copy.footerMemberPrefix}
              <EmailLink href={profileUrl}>{copy.footerMemberLink}</EmailLink>
              {copy.footerMemberSuffix}
            </>
          )}{" "}
          {copy.viewOnlinePrefix}
          <EmailLink href={issueUrl}>{copy.viewOnlineLink}</EmailLink>
          {copy.viewOnlineSuffix}
        </>
      }
    >
      <EmailParagraph>{getGreeting(locale, recipientName)}</EmailParagraph>
      <EmailParagraph>{copy.announcement}</EmailParagraph>
      <EmailParagraph>
        <strong>{issue.title}</strong>
      </EmailParagraph>
      <EmailParagraph>{issue.description}</EmailParagraph>
      <EmailParagraph>{copy.ctaHint}</EmailParagraph>
      <EmailButton href={issueUrl}>{copy.cta}</EmailButton>
      <EmailHr />
      <EmailParagraph>{copy.signOff}</EmailParagraph>
      <EmailParagraph>{copy.team}</EmailParagraph>
    </EmailBody>
  );
};

export default NewsletterIssueEmail;
