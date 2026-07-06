import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import IntroHeader from "@/components/IntroHeader";
import Toast from "@/components/Toast";
import PeelsHowItWorks from "@/components/PeelsHowItWorks";
import HeroButtons from "@/components/HeroButtons";
import PeelsFaq from "@/components/PeelsFaq";
import StaticPageSection from "@/components/StaticPageSection";
import NewsletterIssuesList from "@/components/NewsletterIssuesList";
import HeaderBlock from "@/components/HeaderBlock";
import FooterBlock from "@/components/FooterBlock";
import { PeelsFaqJsonLd } from "@/components/FaqJsonLd/FaqJsonLd";
import { homepageCouncilMentions } from "@/content/partnerMentions";
import { createPeelsMetadata } from "@/utils/seo";
import { styled } from "next-yak";
import { theme } from "@/styles/theme.yak";
import { sharedCenteredPageStackStyles } from "@/styles/commonStyles";

export async function generateMetadata() {
  const t = await getTranslations("Index");
  const description = t("metaDescription");
  const keywords = t("metaKeywords")
    .split(",")
    .map((keyword) => keyword.trim())
    .filter(Boolean);

  const title = `${siteConfig.name}: ${t("title")}`;

  return createPeelsMetadata({
    canonicalPath: "/",
    title: {
      absolute: title,
    },
    description,
    keywords,
    openGraph: {
      title,
      description,
    },
    twitter: {
      title,
      description,
    },
  });
}

export default function Index() {
  const t = useTranslations("Index");

  return (
    <StyledMain>
      {/* Search params in Toast component so that this page can remain static. Just requires Suspense here to work */}
      <Suspense>
        <Toast />
      </Suspense>

      <Intro>
        <IntroHeader />
        <h1>{t("title")}</h1>
        <p>{t("subtitle")}</p>
        <HeroButtons />
      </Intro>

      <StaticPageSection padding="lg">
        <HeaderBlock>
          <h2>{t("howItWorks.title")}</h2>
          <p>{t("howItWorks.subtitle")}</p>
        </HeaderBlock>
        <PeelsHowItWorks />
      </StaticPageSection>

      <StaticPageSection padding="lg" id="partners-section">
        <HeaderBlock>
          <h2>{t("partners.title")}</h2>
          <p>{t("partners.subtitle")}</p>
        </HeaderBlock>
        <PartnerProofPanel>
          <FeaturedPartner
            href={siteConfig.links.partners}
            aria-label={t("partners.logoLinkLabel")}
            title="LOCCAL"
          >
            <Image
              src="/partners/loccal.webp"
              alt={t("partners.loccalLogoAlt")}
              width={192}
              height={144}
            />
          </FeaturedPartner>
          <PartnerProofList aria-label={t("partners.listLabel")}>
            {homepageCouncilMentions.map((mention) => (
              <li key={mention.name}>{mention.name}</li>
            ))}
          </PartnerProofList>
        </PartnerProofPanel>
        <FooterBlock>
          <p>
            {t.rich("partners.footer", {
              page: (chunks) => (
                <Link href={siteConfig.links.partners}>{chunks}</Link>
              ),
            })}
          </p>
        </FooterBlock>
      </StaticPageSection>

      <StaticPageSection padding="lg" id="newsletter-section">
        <HeaderBlock>
          <h2>{t("newsletter.title")}</h2>
          <p>{t("newsletter.subtitle")}</p>
        </HeaderBlock>
        <NewsletterIssuesList showPastIssues={false} />
        <FooterBlock>
          <p>
            {t.rich("newsletter.footer", {
              page: (chunks) => <Link href="/newsletter">{chunks}</Link>,
            })}
          </p>
        </FooterBlock>
      </StaticPageSection>

      <StaticPageSection padding="lg" id="faq-section">
        <PeelsFaqJsonLd variant="summary" />
        <HeaderBlock>
          <h2>{t("faq.title")}</h2>
          <p>{t("faq.subtitle")}</p>
        </HeaderBlock>
        <PeelsFaq variant="summary" />
        <FooterBlock>
          <p>
            {t.rich("faq.footer", {
              page: (chunks) => (
                <Link href={siteConfig.links.contact}>{chunks}</Link>
              ),
            })}
          </p>
        </FooterBlock>
      </StaticPageSection>
    </StyledMain>
  );
}

const StyledMain = styled.main`
  ${sharedCenteredPageStackStyles};
  padding-top: 10vh;
  gap: ${theme.spacing.gap.page.md};

  @media (min-width: 768px) {
    gap: ${theme.spacing.gap.page.lg};
  }
`;

const Intro = styled.div`
  ${sharedCenteredPageStackStyles};
  text-align: center;
  gap: 1.5rem;

  & > h1 {
    max-width: 24ch;
    font-size: 2.75rem;
    letter-spacing: -0.03em;
    line-height: 1.05;
    font-weight: 775;
    color: ${theme.colors.text.primary};
    @media (min-width: 768px) {
      font-size: 4.75rem;
    }
  }
  & > p {
    max-width: 56ch;
    text-wrap: balance;
    font-size: 1.25rem;
    color: ${theme.colors.text.ui.quaternary};
    letter-spacing: -0.028em;
    @media (min-width: 768px) {
      font-size: 1.5rem;
    }
  }
`;

const PartnerProofPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  max-width: ${theme.spacing.container.maxWidth.media};
  padding: calc(${theme.spacing.unit} * 1.5);
  background: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: ${theme.corners.base};

  @media (min-width: 768px) {
    display: grid;
    grid-template-columns: minmax(11rem, 0.8fr) minmax(0, 1.2fr);
    align-items: stretch;
  }
`;

const FeaturedPartner = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  min-height: 12rem;
  padding: 2.75rem;
  text-align: center;
  color: ${theme.colors.text.secondary};
  text-decoration: none;
  border-radius: calc(${theme.corners.base} * 0.75);
  background: ${theme.colors.background.slight};
  border: 1px solid ${theme.colors.border.light};
  transition: ${theme.transitions.textColor};

  &:visited {
    color: ${theme.colors.text.secondary};
  }

  &:hover {
    color: ${theme.colors.text.primary};
  }

  & img {
    width: min(100%, 10rem);
    height: auto;
    object-fit: contain;
  }
`;

const PartnerProofList = styled.ul`
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.25rem;
  width: 100%;
  list-style: none;

  & li {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 3.75rem;
    padding: 0.875rem 1rem;
    text-align: center;
    color: ${theme.colors.text.secondary};

    &:not(:first-child) {
      border-top: 1px solid ${theme.colors.border.light};
    }
  }

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr));

    & li:not(:first-child) {
      border-top: none;
      border-left: 1px solid ${theme.colors.border.light};
    }
  }

  @media (min-width: 768px) {
    grid-template-columns: 1fr;

    & li:not(:first-child) {
      border-left: none;
      border-top: 1px solid ${theme.colors.border.light};
    }
  }
`;
