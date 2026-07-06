import { siteConfig } from "@/config/site";
import StaticPageHeader from "@/components/StaticPageHeader";
import NewsletterIssuesList from "@/components/NewsletterIssuesList";
import NewsletterCallout from "@/components/NewsletterCallout";
import StaticPageSection from "@/components/StaticPageSection";
import Link from "next/link";
import HeaderBlock from "@/components/HeaderBlock";
import FooterBlock from "@/components/FooterBlock";
import AboveTheFoldSection from "@/components/AboveTheFoldSection";
import StaticPageMain from "@/components/StaticPageMain";
import { getLocale, getTranslations } from "next-intl/server";
import { defaultLocale } from "@/i18n/config";
import { createPeelsMetadata } from "@/utils/seo";

export async function generateMetadata() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Newsletter" });
  const description = t("description");

  const title = t("title");

  return createPeelsMetadata({
    canonicalPath: "/newsletter",
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

export default async function NewsletterPage() {
  const locale = await getLocale();
  const t = await getTranslations({ locale, namespace: "Newsletter" });
  const rssHref =
    locale === defaultLocale
      ? "/newsletter/feed.xml"
      : `/newsletter/feed.xml?locale=${locale}`;

  return (
    <StaticPageMain>
      <AboveTheFoldSection>
        <StaticPageHeader title={t("title")} subtitle={t("description")} />
        <NewsletterIssuesList />
      </AboveTheFoldSection>

      <StaticPageSection>
        <HeaderBlock>
          <h2>{t("inboxTitle")}</h2>
          <p>{t("inboxDescription")}</p>
        </HeaderBlock>
        <NewsletterCallout />
        <FooterBlock>
          <p>
            {t.rich("rss", {
              link: (chunks) => <Link href={rssHref}>{chunks}</Link>,
            })}
          </p>
        </FooterBlock>
      </StaticPageSection>
    </StaticPageMain>
  );
}
