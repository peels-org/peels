import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import FormHeader from "@/components/FormHeader";
import FormMessage, { Message } from "@/components/FormMessage";
import Form from "@/components/Form";
import { getTranslations } from "next-intl/server";

export default async function ForgotPassword(props: {
  searchParams: Promise<
    Message & { email?: string; support_reference?: string }
  >;
}) {
  const searchParams = await props.searchParams;
  const t = await getTranslations();

  if (searchParams.success) {
    return (
      <>
        <FormHeader button="none">
          <h1>{t("Auth.forgotPassword.sentTitle")}</h1>
        </FormHeader>
        <Form as="container">
          {/* TODO: include address that was emailed, so user can notice any typos */}
          <p>{searchParams.success}</p>
        </Form>
      </>
    );
  }

  return (
    <>
      <FormHeader button="back">
        <h1>{t("Auth.forgotPassword.title")}</h1>
        <p>{t("Auth.forgotPassword.body")}</p>
      </FormHeader>
      <ForgotPasswordForm
        defaultEmail={searchParams.email}
        error={
          typeof searchParams.error === "string"
            ? searchParams.error
            : undefined
        }
        supportReference={searchParams.support_reference}
      />
    </>
  );
}
