import { getTranslations } from "next-intl/server";
import { siteConfig } from "@/config/site";
import FormHeader from "@/components/FormHeader";
import Form from "@/components/Form";
import FormFooter from "@/components/FormFooter";
import StrongLink from "@/components/StrongLink";
import EncodedEmailLink from "@/components/EncodedEmailLink";
import SignUpForm from "@/components/SignUpForm";
import { createPeelsMetadata, noindexFollowMetadata } from "@/utils/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations();

  const title = t("Actions.signUp");

  return createPeelsMetadata({
    ...noindexFollowMetadata,
    canonicalPath: "/sign-up",
    title,
    openGraph: {
      title: `${title} · ${siteConfig.name}`,
    },
    twitter: {
      title: `${title} · ${siteConfig.name}`,
    },
  });
}

export default async function SignUp(props: {
  searchParams: Promise<{
    error?: string;
    success?: boolean;
    email?: string;
    first_name?: string;
    from?: string;
    newsletter_preference?: string;
  }>;
}) {
  // const t = await getTranslations("SignUp");
  // Step out of "SignUp" because this component currently uses Actions translations too
  // Ideally this Actions translation(s) part is extracted into its own component
  const t = await getTranslations();

  const searchParams = await props.searchParams;

  // Handle success state
  if (searchParams.success) {
    return (
      <>
        <FormHeader button="none">
          <h1>{t("SignUp.header.checkYourEmail")}</h1>
        </FormHeader>
        <Form as="container">
          <p>
            {t("SignUp.body.thanks", { name: searchParams.first_name ?? "" })}
          </p>
        </Form>
        <FormFooter>
          <p>
            {t("SignUp.footer.neverGotEmail")}{" "}
            {/* TODO: Allow for verification email to be resent to {searchParams.email} after a countdown,
                before this 'reach out'becomes an option. */}
            <EncodedEmailLink address={siteConfig.encodedEmail.team}>
              {t("SignUp.footer.reachOut")}
            </EncodedEmailLink>{" "}
            {t("SignUp.footer.stillNeedHelp")}
          </p>
        </FormFooter>
      </>
    );
  }

  return (
    <>
      {/* TODO if modal, overlay sign up UI added: 
      Make FormHeader action conditional based on whether this page (which should be a component) is rendered modally or as a page */}
      <FormHeader button="back">
        <h1>
          {t("SignUp.header.signUpTo")}{" "}
          {searchParams.from === "listing"
            ? t("SignUp.header.contactHosts")
            : t("SignUp.header.startComposting")}
        </h1>
      </FormHeader>

      <SignUpForm
        defaultValues={{
          first_name: searchParams.first_name,
          email: searchParams.email,
          newsletter_preference: searchParams.newsletter_preference
            ? searchParams.newsletter_preference === "true"
            : undefined,
        }}
        error={searchParams.error}
      />

      <FormFooter>
        <p>
          {t("SignUp.footer.haveAccount")}{" "}
          <StrongLink href="/sign-in">{t("Actions.signIn")}</StrongLink>
        </p>
      </FormFooter>
    </>
  );
}
