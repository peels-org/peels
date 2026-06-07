import { Heading, Text, Row } from "npm:@react-email/components";
import EmailBody from "./components/EmailBody.tsx";
import EmailAvatar from "./components/EmailAvatar.tsx";
import EmailButton from "./components/EmailButton.tsx";
import EmailParagraph from "./components/EmailParagraph.tsx";
import EmailLink from "./components/EmailLink.tsx";
import { assignments } from "../_shared/tokens.js";
import { getChatEmailCopy, type SupportedLocale } from "../_shared/i18n.ts";
import { getPublicSiteUrl } from "../_shared/app-origin.ts";
import * as React from "npm:react";

interface NewChatMessageEmailProps {
  locale: SupportedLocale;
  senderName: string;
  recipientName: string;
  // messageContent: string;
  threadId: string;
  listingSlug: string;
  listingAreaName: string;
  recipientRole: string;
  avatarMajorUrl?: string;
  avatarMajorBucket?: string;
  avatarMinorUrl?: string;
  listingName?: string;
  listingType?: string;
  ownerHasMultipleNonResidentialListings?: boolean;
}

export const NewChatMessageEmail = ({
  locale,
  senderName,
  recipientName,
  // messageContent,
  threadId,
  listingSlug,
  listingAreaName,
  recipientRole,
  avatarMajorUrl,
  avatarMajorBucket,
  avatarMinorUrl,
  listingName,
  listingType,
  ownerHasMultipleNonResidentialListings,
}: NewChatMessageEmailProps) => {
  const siteUrl = getPublicSiteUrl();
  const copy = getChatEmailCopy(locale);
  const listingContext =
    ownerHasMultipleNonResidentialListings && listingName
      ? locale === "es"
        ? ` sobre tu ubicación ${listingName}`
        : locale === "de"
          ? ` zu deinem Standort ${listingName}`
          : locale === "pt-BR"
            ? ` sobre o teu local ${listingName}`
            : locale === "fr"
              ? ` au sujet de votre lieu ${listingName}`
              : ` about your ${listingName} location`
      : "";
  return (
    <EmailBody
      logoUnread={true}
      previewText={copy.preview
        .replace("{recipientName}", recipientName)
        .replace("{senderName}", senderName)}
      headingText={copy.heading}
      footerText={
        recipientRole === "owner" ? (
          <>
            {copy.ownerFooterBeforeLink}
            <EmailLink href={`${siteUrl}/profile/listings/${listingSlug}`}>
              {copy.ownerFooterLink}
            </EmailLink>
            {copy.ownerFooterAfterLink}
          </>
        ) : (
          <>
            {copy.initiatorFooterBeforeLink.replace("{senderName}", senderName)}
            <EmailLink href={`${siteUrl}/chats/${threadId}`}>
              {copy.initiatorFooterLink}
            </EmailLink>
            {copy.initiatorFooterAfterLink}
          </>
        )
      }
    >
      <EmailAvatar
        avatarMajorUrl={avatarMajorUrl}
        avatarMajorBucket={avatarMajorBucket}
        avatarMinorUrl={avatarMinorUrl ? avatarMinorUrl : undefined}
        listingType={listingType ? listingType : undefined}
      />

      <Row style={avatarSubtitleRow}>
        <Heading as="h2" style={senderHeading}>
          {senderName}
        </Heading>

        {recipientRole === "initiator" && (
          <Text style={listingByline}>
            {listingName
              ? listingName
              : copy.residentOf.replace("{listingAreaName}", listingAreaName)}
          </Text>
        )}
      </Row>

      <EmailParagraph>
        {copy.body
          .replace("{recipientName}", recipientName)
          .replace("{senderName}", senderName)
          .replace("{listingContext}", listingContext)}
      </EmailParagraph>

      <EmailButton href={`${siteUrl}/chats/${threadId}`}>
        {copy.button}
      </EmailButton>

      <EmailParagraph>
        {copy.signOff},
        <br />
        {copy.team}
      </EmailParagraph>
    </EmailBody>
  );
};

export default NewChatMessageEmail;

const avatarSubtitleRow = {
  margin: "4px auto 32px auto",
};

const senderHeading = {
  fontSize: "24px",
  lineHeight: "110%",
  letterSpacing: "-0.015em",
  margin: "12px auto 0",
  textAlign: "center" as const,
  textWrap: "balance" as const,
  color: assignments.colors.text.brand.primary,
};
const listingByline = {
  fontSize: "14px",
  lineHeight: "110%",
  letterSpacing: "-0.015em",
  margin: "6px auto 0",
  textAlign: "center" as const,
  textWrap: "balance" as const,
  color: assignments.colors.text.ui.quaternary,
};
