import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import StaticPageMain from "@/components/StaticPageMain";
import StaticPageHeader from "@/components/StaticPageHeader";
import StaticPageSection from "@/components/StaticPageSection";
import SupportFaq from "@/components/SupportFaq";
import PeelsFaq from "@/components/PeelsFaq";
import HeaderBlock from "@/components/HeaderBlock";
import ContactEmail from "@/components/ContactEmail/ContactEmail";
import { HelpFaqJsonLd } from "@/components/FaqJsonLd/FaqJsonLd";
import { createPeelsMetadata } from "@/utils/seo";

export async function generateMetadata() {
  const t = await getTranslations("Support");
  const description = t("metaDescription");

  const title = t("title");

  return createPeelsMetadata({
    canonicalPath: "/contact",
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

export default function Contact() {
  const t = useTranslations("Support");
  return (
    <StaticPageMain>
      <HelpFaqJsonLd />
      <StaticPageHeader title={t("title")} subtitle={t("subtitle")} />

      <StaticPageSection id="contact" padding={null}>
        <HeaderBlock>
          <p>{t("contact.subtitle")}</p>
        </HeaderBlock>
        <ContactEmail />
      </StaticPageSection>

      <StaticPageSection>
        <HeaderBlock>
          <h2>{t("supportFaq.title")}</h2>
        </HeaderBlock>
        <SupportFaq />
      </StaticPageSection>

      <StaticPageSection>
        <HeaderBlock>
          <h2>{t("peelsFaq.title")}</h2>
        </HeaderBlock>
        <PeelsFaq variant="about" />
      </StaticPageSection>

      <StaticPageSection>
        <HeaderBlock>
          <h2>{t("peelsFaq.communityTitle")}</h2>
        </HeaderBlock>
        <PeelsFaq variant="community" />
      </StaticPageSection>
    </StaticPageMain>
  );
}
