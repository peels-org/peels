import { siteConfig } from "@/config/site";
import StrongLink from "@/components/StrongLink";
import EncodedEmailLink from "@/components/EncodedEmailLink";
import Button from "@/components/Button";
import PeelsLogo from "@/components/PeelsLogo";
import { styled } from "next-yak";
import { useTranslations } from "next-intl";
import { theme } from "@/styles/theme.yak";

const StyledListingCta = styled.aside`
  background-color: ${theme.colors.background.slight};
  border: 1px solid ${theme.colors.border.light};
  border-radius: ${theme.corners.base};
  padding: 1.5rem;
  display: flex;
  gap: 0.75rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  & p {
    color: ${theme.colors.text.ui.tertiary};
    text-wrap: balance;
  }
`;

const Text = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  & p {
    font-size: 0.875rem;
  }
`;

function ListingCta({
  viewer,
  slug,
  visibility = true,
  isStub = false,
}: {
  viewer?: "owner" | "guest" | null;
  slug: string;
  visibility?: boolean;
  isStub?: boolean;
}) {
  const t = useTranslations();

  if (viewer === "owner") {
    return (
      <StyledListingCta data-testid="listing-owner-cta">
        <Button
          variant="secondary"
          width="full"
          href={`/profile/listings/${slug}`}
        >
          {t("Listings.edit.title")}
        </Button>
        <p>
          {t("Listings.read.ownerNote", {
            stub: isStub ? "true" : "false",
            visibility: visibility ? "true" : "false",
          })}
        </p>
      </StyledListingCta>
    );
  }
  if (isStub) {
    return (
      <StyledListingCta data-testid="listing-stub-cta">
        <PeelsLogo color="quaternary" />
        <Text>
          <p>{t("Listings.read.stubNote")}</p>
          <p>
            {t.rich("Listings.read.stubClaim", {
              link: (chunks) => (
                <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                  {chunks}
                </EncodedEmailLink>
              ),
            })}
          </p>
        </Text>
      </StyledListingCta>
    );
  }

  return (
    <StyledListingCta data-testid="listing-guest-cta">
      <Button
        variant="primary"
        width="full"
        href={`/sign-in?redirect_to=/listings/${slug}`}
        data-testid="listing-sign-in-to-contact"
      >
        {t("Actions.signInToContact")}
      </Button>
      <p>
        {t.rich("Listings.read.firstTime", {
          link: (chunks) => <StrongLink href="/sign-up">{chunks}</StrongLink>,
        })}
      </p>
    </StyledListingCta>
  );
}

export default ListingCta;
