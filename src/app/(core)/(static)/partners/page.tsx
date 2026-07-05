import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { styled } from "next-yak";

import EncodedEmailLink from "@/components/EncodedEmailLink";
import HeaderBlock from "@/components/HeaderBlock";
import StaticPageHeader from "@/components/StaticPageHeader";
import StaticPageMain from "@/components/StaticPageMain";
import StaticPageSection from "@/components/StaticPageSection";
import StrongLink from "@/components/StrongLink";
import { siteConfig } from "@/config/site";
import {
  communityMediaMentions,
  communityPartners,
  councilMentions,
} from "@/content/partnerMentions";
import { sharedAnchorTagStyles } from "@/styles/commonStyles";
import { theme } from "@/styles/theme.yak";
import { createPeelsMetadata } from "@/utils/seo";

export async function generateMetadata() {
  const t = await getTranslations("Partners");
  const description = t("metaDescription");

  const title = t("title");

  return createPeelsMetadata({
    canonicalPath: "/partners",
    title,
    description,
    openGraph: {
      title: `${title} · ${siteConfig.name}`,
      description,
    },
    twitter: {
      title: `${title} · ${siteConfig.name}`,
      description,
    },
  });
}

export default async function PartnersPage() {
  const t = await getTranslations("Partners");

  return (
    <StaticPageMain>
      <StaticPageHeader title={t("title")} subtitle={t("subtitle")} />

      <StaticPageSection padding={null}>
        <HeaderBlock>
          <h2>{t("communityPartners.title")}</h2>
          <p>{t("communityPartners.subtitle")}</p>
        </HeaderBlock>
        <PartnerList>
          {communityPartners.map((partner) => (
            <PartnerItem key={partner.name}>
              <PartnerLogoFrame>
                <Image
                  src={partner.logoSrc}
                  alt={t(partner.logoAltKey)}
                  width={240}
                  height={240}
                  priority
                />
              </PartnerLogoFrame>
              <PartnerCopy>
                <h3>{partner.name}</h3>
                <p>{t(partner.descriptionKey)}</p>
                <StrongLink href={partner.href} target="_blank">
                  {t("communityPartners.visitPartner", { name: partner.name })}
                </StrongLink>
              </PartnerCopy>
            </PartnerItem>
          ))}
        </PartnerList>
      </StaticPageSection>

      <StaticPageSection>
        <HeaderBlock>
          <h2>{t("councilMentions.title")}</h2>
          <p>{t("councilMentions.subtitle")}</p>
        </HeaderBlock>
        <MentionCard>
          <MentionGrid aria-label={t("councilMentions.listLabel")}>
            {councilMentions.map((mention) => (
              <li key={mention.name}>
                <StrongLink href={mention.href} target="_blank">
                  {mention.name}
                </StrongLink>
              </li>
            ))}
          </MentionGrid>
        </MentionCard>
      </StaticPageSection>

      <StaticPageSection>
        <HeaderBlock>
          <h2>{t("communityMediaMentions.title")}</h2>
          <p>{t("communityMediaMentions.subtitle")}</p>
        </HeaderBlock>
        <MentionCard>
          <MentionGrid aria-label={t("communityMediaMentions.listLabel")}>
            {communityMediaMentions.map((mention) => (
              <li key={mention.name}>
                <StrongLink href={mention.href} target="_blank">
                  {mention.name}
                </StrongLink>
              </li>
            ))}
          </MentionGrid>
        </MentionCard>
      </StaticPageSection>

      <StaticPageSection>
        <Callout>
          <h2>{t("cta.title")}</h2>
          <p>
            {t.rich("cta.body", {
              share: (chunks) => (
                <StrongLink href={siteConfig.links.share}>{chunks}</StrongLink>
              ),
              email: (chunks) => (
                <EncodedEmailLink address={siteConfig.encodedEmail.general}>
                  {chunks}
                </EncodedEmailLink>
              ),
            })}
          </p>
        </Callout>
      </StaticPageSection>
    </StaticPageMain>
  );
}

const PartnerList = styled.ul`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: ${theme.spacing.container.maxWidth.media};
  list-style: none;
`;

const PartnerItem = styled.li`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  padding: calc(${theme.spacing.unit} * 3);
  background: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: ${theme.corners.base};
  text-align: center;

  & h3 {
    margin-bottom: 0.375rem;
    font-size: 1.45rem;
    line-height: ${theme.typography.lineHeight.h};
    color: ${theme.colors.text.primary};
  }

  & p {
    color: ${theme.colors.text.ui.quaternary};
    font-size: ${theme.typography.size.p.md};
    line-height: ${theme.typography.lineHeight.p.md};
  }

  @media (min-width: 640px) {
    flex-direction: row;
    align-items: center;
    text-align: left;
    padding: calc(${theme.spacing.unit} * 4);
  }
`;

const PartnerLogoFrame = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 100%;
  padding: 1.75rem 1rem;
  border-radius: calc(${theme.corners.base} * 0.75);
  background: ${theme.colors.background.slight};
  border: 1px solid ${theme.colors.border.light};

  & img {
    width: 100%;
    max-width: 10rem;
    height: auto;
    max-height: 4.5rem;
    object-fit: contain;
  }

  @media (min-width: 640px) {
    width: min(100%, 14rem);
    aspect-ratio: 1 / 1;
    padding: 2.75rem;

    & img {
      width: auto;
      height: auto;
      max-width: 75%;
      max-height: 75%;
    }
  }
`;

const PartnerCopy = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;

  @media (min-width: 640px) {
    align-items: flex-start;
  }
`;

const MentionCard = styled.div`
  width: 100%;
  max-width: ${theme.spacing.container.maxWidth.media};
  padding: calc(${theme.spacing.unit} * 1.5);
  background: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: ${theme.corners.base};
`;

const MentionGrid = styled.ul`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
  width: 100%;
  list-style: none;

  & li {
    min-width: 0;
    padding: 0.875rem 1rem;
    text-align: center;
    color: ${theme.colors.text.secondary};
    font-size: ${theme.typography.size.p.md};
    line-height: ${theme.typography.lineHeight.p.md};

    &:not(:first-child) {
      border-top: 1px solid ${theme.colors.border.light};
    }
  }

  @media (min-width: 640px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));

    & li:nth-child(2) {
      border-top: none;
    }
  }
`;

const Callout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${theme.spacing.gap.sectionInner};
  width: 100%;
  max-width: ${theme.spacing.container.maxWidth.media};
  text-align: center;

  & h2 {
    font-size: 1.75rem;
    line-height: ${theme.typography.lineHeight.h};
    color: ${theme.colors.text.primary};
  }

  & p {
    max-width: 48ch;
    color: ${theme.colors.text.ui.quaternary};
    font-size: ${theme.typography.size.p.lg};
    line-height: ${theme.typography.lineHeight.p.lg};
    text-wrap: balance;
  }

  & a {
    ${sharedAnchorTagStyles}
    color: ${theme.colors.text.brand.primary};
  }

  & a:visited {
    color: ${theme.colors.text.brand.primary};
  }
`;
