"use client";

import { theme } from "@/styles/theme.yak";
import { useState } from "react";
import { siteConfig } from "@/config/site";
import EncodedEmailLink from "@/components/EncodedEmailLink";
import DecodedSpan from "@/components/DecodedSpan";
import Button from "@/components/Button";
import PostageStamp from "@/components/PostageStamp";
import { styled } from "next-yak";
import { useTranslations } from "next-intl";
import { decodeEncodedEmail } from "@/utils/email";

type CopyStatus = "idle" | "copying" | "copied" | "error";

const teamEmail = siteConfig.encodedEmail.team;

export default function ContactEmail() {
  const t = useTranslations("Contact");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");

  const handleCopy = async () => {
    if (copyStatus === "copying") return;

    setCopyStatus("copying");
    try {
      await Promise.all([
        navigator.clipboard.writeText(decodeEncodedEmail(teamEmail)),
        new Promise((resolve) => setTimeout(resolve, 150)),
      ]);
      setCopyStatus("copied");
    } catch (error) {
      console.error("Error copying email address:", error);
      setCopyStatus("error");
    }
  };

  return (
    <FormSection>
      <PostageStamp />
      <EmailBlock>
        <EmailLabelText>{t("emailLabel")}</EmailLabelText>
        <EmailActionRow>
          <EncodedEmailLink address={teamEmail}>
            <DecodedSpan>{teamEmail}</DecodedSpan>
          </EncodedEmailLink>
          <Button
            onClick={handleCopy}
            loading={copyStatus === "copying"}
            loadingText={t("copyButton.copying")}
          >
            {copyStatus === "copied"
              ? t("copyButton.copied")
              : copyStatus === "error"
                ? t("copyButton.copyFailed")
                : t("copyButton.copyAddress")}
          </Button>
        </EmailActionRow>
      </EmailBlock>
    </FormSection>
  );
}

const FormSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  padding: 2rem;
  border-radius: ${theme.corners.base};
  background: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  overflow: hidden;
  position: relative;
`;

const EmailBlock = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: ${theme.spacing.forms.gap.field};

  & a {
    font-weight: 600;
    font-size: 1.5rem;
  }

  @media (min-width: 768px) {
    width: 100%;

    & a {
      font-size: 1.75rem;
    }
  }
`;

const EmailLabelText = styled.p`
  color: ${theme.colors.text.ui.primary};
  font-weight: 500;
`;

const EmailActionRow = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1rem;
  width: 100%;

  @media (min-width: 768px) {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 1.5rem;
  }
`;
