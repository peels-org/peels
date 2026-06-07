import EmailBody from "./components/EmailBody.tsx";
import EmailButton from "./components/EmailButton.tsx";
import EmailParagraph from "./components/EmailParagraph.tsx";
import EmailTextEmphasized from "./components/EmailTextEmphasized.tsx";
import EmailLink from "./components/EmailLink.tsx";
import { getPublicSiteUrl } from "../_shared/app-origin.ts";
import * as React from "npm:react";

interface NewFeatureEmailProps {
  recipientName: string;
}

// An email template for one-off announcements to users
export const NewFeatureEmail = ({ recipientName }: NewFeatureEmailProps) => {
  const siteUrl = getPublicSiteUrl();
  return (
    <EmailBody
      previewText={`We’ve just added a newsletter option to Peels. Here’s how to opt-in if you’d like to get it. Just head to your Profile and edit the ‘Newsletter’ option.`}
      headingText={`Announcing the Peels newsletter`}
      footerText={
        <>
          You’re receiving this email because you have an account on Peels and
          this change affects our privacy policy. You can update your
          preferences <EmailLink href={`${siteUrl}/profile`}>here</EmailLink>.
        </>
      }
    >
      <EmailParagraph>
        Hi {recipientName}, this is a one-off email to announce the Peels
        newsletter. It didn’t exist when you signed up and it will be{" "}
        <EmailTextEmphasized>opt-in</EmailTextEmphasized> (disabled by default).
      </EmailParagraph>

      <EmailParagraph>
        Should you wish to subscribe, sign in to Peels and{" "}
        <EmailTextEmphasized>edit the ‘Newsletter’ option</EmailTextEmphasized>{" "}
        on <EmailLink href={`${siteUrl}/profile`}>your Profile page</EmailLink>.
      </EmailParagraph>

      <EmailButton href={`${siteUrl}/profile`}>
        Enable it on your Profile
      </EmailButton>

      <EmailParagraph>
        Or just <EmailTextEmphasized>reply to this email</EmailTextEmphasized>{" "}
        and we can add you manually.
      </EmailParagraph>

      <EmailParagraph>
        Issues will be sent 2–3 times a year, and focus on how folks are using
        Peels around the world.
      </EmailParagraph>

      <EmailParagraph>
        Got other ideas for what should be in the Peels newsletter? Please let
        us know!
      </EmailParagraph>

      <EmailParagraph>
        By the way, we’ve updated our{" "}
        <EmailLink
          href={`${siteUrl}/privacy#:~:text=With%20your%20explicit%20consent%20(opt%2Din)%2C%20we%20may%20also%20use%20your%20email%20address%20to%20send%20occasional%20newsletters%20about%20Peels.%20You%20can%20unsubscribe%20at%20any%20time%20via%20the%20link%20in%20emails%20or%20your%20profile%20settings.`}
        >
          privacy policy
        </EmailLink>{" "}
        to reflect this new feature.
      </EmailParagraph>

      <EmailParagraph>
        Best,
        <br />
        Peels team
      </EmailParagraph>
    </EmailBody>
  );
};

export default NewFeatureEmail;
