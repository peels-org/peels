import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import FaqContainer from "@/components/FaqContainer";
import FaqDetails from "@/components/FaqDetails";
import StrongLink from "@/components/StrongLink";
import EncodedEmailLink from "@/components/EncodedEmailLink";
import type { PeelsFaqVariant } from "@/utils/faqJsonLd";

type PeelsFaqProps = {
  variant?: PeelsFaqVariant;
};

async function PeelsFaq({ variant = "full" }: PeelsFaqProps) {
  const t = await getTranslations("Support.peelsFaq");
  const showAboutFaq = variant !== "community";
  const showExtendedAboutFaq = variant === "about" || variant === "full";
  const showCommunityFaq = variant === "community" || variant === "full";

  return (
    <FaqContainer>
      {showAboutFaq ? (
        <>
          <FaqDetails>
            <summary>{t("whatIsPeels.question")}</summary>
            <p>{t("whatIsPeels.answer")}</p>
          </FaqDetails>
          {variant === "summary" ? (
            <>
              <FaqDetails>
                <summary>{t("findDropOff.question")}</summary>
                {t.rich("findDropOff.answer", {
                  p: (chunks) => <p>{chunks}</p>,
                  map: (chunks) => (
                    <StrongLink href="/map">{chunks}</StrongLink>
                  ),
                })}
              </FaqDetails>
              <FaqDetails>
                <summary>{t("noGarden.question")}</summary>
                <p>{t("noGarden.answer")}</p>
              </FaqDetails>
            </>
          ) : null}
          <FaqDetails>
            <summary>{t("businesses.question")}</summary>
            {t.rich("businesses.answer", {
              p: (chunks) => <p>{chunks}</p>,
              join: (chunks) => (
                <StrongLink href="/profile/listings/new/business">
                  {chunks}
                </StrongLink>
              ),
            })}
          </FaqDetails>
          {variant === "summary" ? (
            <FaqDetails>
              <summary>{t("mapPrivacy.question")}</summary>
              {t.rich("mapPrivacy.answer", {
                p: (chunks) => <p>{chunks}</p>,
              })}
            </FaqDetails>
          ) : null}
        </>
      ) : null}
      {showExtendedAboutFaq ? (
        <>
          <FaqDetails>
            <summary>{t("howDifferent.question")}</summary>
            {t.rich("howDifferent.answer", {
              p: (chunks) => <p>{chunks}</p>,
            })}
          </FaqDetails>
          <FaqDetails>
            <summary>{t("fogo.question")}</summary>
            <p>{t("fogo.answer")}</p>
          </FaqDetails>
        </>
      ) : null}
      {showCommunityFaq ? (
        <>
          <FaqDetails>
            <summary>{t("financialModel.question")}</summary>
            <p>{t("financialModel.answer")}</p>
          </FaqDetails>
          <FaqDetails>
            <summary>{t("whosBehind.question")}</summary>
            {t.rich("whosBehind.answer", {
              p: (chunks) => <p>{chunks}</p>,
              danny: (chunks) => (
                <StrongLink href="https://dannywhite.net" target="_blank">
                  {chunks}
                </StrongLink>
              ),
              opensource: (chunks) => (
                <StrongLink
                  href={`${siteConfig.repoUrl}?tab=readme-ov-file`}
                  target="_blank"
                >
                  {chunks}
                </StrongLink>
              ),
            })}
          </FaqDetails>
          <FaqDetails>
            <summary>{t("getInvolved.question")}</summary>
            {t.rich("getInvolved.answer", {
              p: (chunks) => <p>{chunks}</p>,
              repo: (chunks) => (
                <StrongLink
                  href={`${siteConfig.repoUrl}?tab=readme-ov-file`}
                  target="_blank"
                >
                  {chunks}
                </StrongLink>
              ),
              email: (chunks) => (
                <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                  {chunks}
                </EncodedEmailLink>
              ),
            })}
          </FaqDetails>
          <FaqDetails>
            <summary>{t("promotion.question")}</summary>
            {t.rich("promotion.answer", {
              p: (chunks) => <p>{chunks}</p>,
              share: (chunks) => (
                <StrongLink href={siteConfig.links.share}>{chunks}</StrongLink>
              ),
              email: (chunks) => (
                <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                  {chunks}
                </EncodedEmailLink>
              ),
            })}
          </FaqDetails>
          <FaqDetails>
            <summary>{t("government.question")}</summary>
            {t.rich("government.answer", {
              p: (chunks) => <p>{chunks}</p>,
              partners: (chunks) => (
                <StrongLink href={siteConfig.links.partners}>
                  {chunks}
                </StrongLink>
              ),
              share: (chunks) => (
                <StrongLink href={siteConfig.links.share}>{chunks}</StrongLink>
              ),
              email: (chunks) => (
                <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                  {chunks}
                </EncodedEmailLink>
              ),
            })}
          </FaqDetails>
        </>
      ) : null}
    </FaqContainer>
  );
}

export default PeelsFaq;
