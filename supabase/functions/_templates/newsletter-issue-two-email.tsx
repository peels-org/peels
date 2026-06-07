import EmailBody from "./components/EmailBody.tsx";
import EmailAside from "./components/EmailAside.tsx";
import EmailImage from "./components/EmailImage.tsx";
import EmailHeading from "./components/EmailHeading.tsx";
import EmailParagraph from "./components/EmailParagraph.tsx";
import EmailTextEmphasized from "./components/EmailTextEmphasized.tsx";
import EmailLink from "./components/EmailLink.tsx";
import EmailHr from "./components/EmailHr.tsx";
import EmailUnorderedList from "./components/EmailUnorderedList.tsx";
import EmailListItem from "./components/EmailListItem.tsx";
import { getPublicSiteUrl } from "../_shared/app-origin.ts";
import * as React from "npm:react";

interface NewsletterIssueTwoEmailProps {
  recipientName: string;
  externalAudience: boolean;
}

const replyEmailAddress = Deno.env.get("GENERAL_EMAIL_ADDRESS");
const staticAssetUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/static`;
const issueSlug = "beginning-to-look-like-compost";

// An email template for newsletter issues, both to opted-in users and broadcast audiences
// Make a new copy for each new newsletter issue so contents aren't overridden (and can be borrowed for future issues)
export const NewsletterIssueTwoEmail = ({
  recipientName = "there",
  externalAudience,
}: NewsletterIssueTwoEmailProps) => {
  const siteUrl = getPublicSiteUrl();
  const repoUrl = "https://github.com/dnywh/peels";
  const issueAssetUrl = `${staticAssetUrl}/newsletter/2`;
  return (
    <EmailBody
      previewText={`We’ve made it to the end of 2025, and Peels is about to turn one. Here’s a brief update.`}
      headingText={`It’s beginning to look a lot like compost`}
      footerText={
        <>
          {externalAudience ? (
            <>
              If you prefer not to receive these occasional Peels updates, you
              can unsubscribe{" "}
              <EmailLink href="{{{RESEND_UNSUBSCRIBE_URL}}}">here</EmailLink>.
            </>
          ) : (
            <>
              You’re receiving this email because you have an account on Peels
              and opted-in to our occasional newsletter. You can unsubscribe{" "}
              <EmailLink href={`${siteUrl}/profile`}>here</EmailLink>.
            </>
          )}{" "}
          <EmailLink href={`${siteUrl}/newsletter/${issueSlug}`}>
            View or share this issue online
          </EmailLink>
          .
        </>
      }
    >
      {/* Introduction */}
      <EmailParagraph>Hi {recipientName},</EmailParagraph>
      <EmailParagraph>
        It’s the end of the year, and{" "}
        <EmailLink href={siteUrl}>Peels</EmailLink> is about to turn one. For
        those who were here from the start: thanks for making Peels what it is.
        For the newcomers: welcome!
      </EmailParagraph>
      <EmailParagraph>
        Since the start of the year, 25+ local and state governments, industry
        bodies, and non-profits have pointed people to Peels, with plenty more
        mentions elsewhere. Here are some recents:
      </EmailParagraph>
      <EmailUnorderedList>
        <EmailListItem>
          <EmailLink href="https://podcasts.apple.com/au/podcast/how-to-save-our-planet/id1648409844?i=1000732698117">
            How to Save Our Planet
          </EmailLink>{" "}
          included Peels in its composting episode.
        </EmailListItem>
        <EmailListItem>
          <EmailLink href="https://responsiblecafes.org/peels-replaces-sharewaste/">
            Responsible Cafes
          </EmailLink>{" "}
          featured Peels in a community composting guide.
        </EmailListItem>
        <EmailListItem>
          <EmailLink href="https://therot.substack.com/p/meet-danny-and-his-compost-app-peels">
            The Rot
          </EmailLink>{" "}
          interviewed me about how Peels started.
        </EmailListItem>
      </EmailUnorderedList>
      <EmailParagraph>
        You can see the full list on our{" "}
        <EmailLink href={`${siteUrl}/partners`}>Partners page</EmailLink>.
      </EmailParagraph>
      <EmailAside title="About this email">
        {externalAudience ? (
          <>
            You’re receiving this email because you helped spread the word about
            Peels earlier this year, and we thought you might like to hear
            what’s happened since. You can unsubscribe{" "}
            <EmailLink href="{{{RESEND_UNSUBSCRIBE_URL}}}">here</EmailLink>.
          </>
        ) : (
          <>
            You’re receiving this email because you opted-in to the Peels
            newsletter. You can edit your preferences{" "}
            <EmailLink href={`${siteUrl}/profile`}>here</EmailLink>.
          </>
        )}
      </EmailAside>
      {/* Major section */}
      <EmailHr />
      <EmailHeading as="h2">Host spotlight</EmailHeading>
      <EmailParagraph>
        To help close out the year, here are a few newer hosts we’ve loved
        seeing join Peels, each doing community composting a little differently.
      </EmailParagraph>
      <EmailParagraph>
        <EmailLink href={`${siteUrl}/map?listing=5vn8TsMrh3oC`} target="_blank">
          Kaicycle
        </EmailLink>{" "}
        joined Peels in mid-October and operates three compost drop-off sites in
        Wellington, New Zealand. Community-led composting plays an important
        role in New Zealand, where national kerbside composting faces{" "}
        <EmailLink
          href="https://www.compostconnect.org/new-zealands-waste-policy-evolution/#:~:text=Mandatory%20kerbside%20composting%20for%20all%20urban%20areas"
          target="_blank"
        >
          rollout challenges
        </EmailLink>
        .
      </EmailParagraph>
      <EmailImage
        src={`${issueAssetUrl}/kaicycle.jpg`}
        height={400}
        alt="A group of Kaicycle volunteers sitting in a trailer, smiling for the camera"
        caption={
          <>
            Some of the{" "}
            <EmailLink href="https://kaicycle.org.nz/for-residents">
              Kaicycle
            </EmailLink>{" "}
            crew in Wellington, New Zealand.
          </>
        }
      />
      <EmailParagraph>
        Across the Pacific, we have{" "}
        <EmailLink href={`${siteUrl}/listings/ukUWLKVa0qar`} target="_blank">
          Esperanza’s Sanctuary
        </EmailLink>
        , a farm and community resource hub just outside of Palm Springs,
        California. Pick up an empty bucket, return it when it’s full, and
        they’ll show you how to compost.
      </EmailParagraph>
      <EmailImage
        src={`${issueAssetUrl}/esperanzas-sanctuary.jpg`}
        height={296}
        alt="A group of volunteers posing with shovels in front of compost piles"
        caption={
          <>
            Working on compost piles at{" "}
            <EmailLink
              href="https://esperanzassanctuary.com/about"
              target="_blank"
            >
              Esperanza’s Sanctuary
            </EmailLink>{" "}
            in Coachella Valley, California.
          </>
        }
      />
      <EmailParagraph>
        Bringing things back down to the southern hemisphere, we have{" "}
        <EmailLink href={`${siteUrl}/listings/vmobuio1RAD5`} target="_blank">
          Power Neighbourhood House
        </EmailLink>{" "}
        in Melbourne, Australia. Their work centres on community inclusion, with
        composting and gardening playing a big role.
      </EmailParagraph>
      <EmailImage
        src={`${issueAssetUrl}/power-neighbourhood-house.jpg`}
        height={400}
        alt="A group of volunteers gathered around a garden bed"
        caption={
          <>
            Volunteers at{" "}
            <EmailLink href="https://www.powernh.org.au" target="_blank">
              Power Neighbourhood House
            </EmailLink>{" "}
            in Ashwood, Melbourne, Australia.
          </>
        }
      />
      <EmailParagraph>
        Are you a host too?{" "}
        <EmailLink
          href={`mailto:${replyEmailAddress}?subject=Response to Peels Newsletter Issue 2&body=Hi Danny, I’d like to be featured in the Peels newsletter.`}
        >
          Let me know
        </EmailLink>{" "}
        if you’d like to be featured.
      </EmailParagraph>
      {/* Major section */}
      <EmailHr />
      <EmailHeading as="h2">Get involved</EmailHeading>
      <EmailParagraph>
        Many would-be compost donors and hosts simply haven’t heard about Peels.{" "}
        <EmailLink
          href={`mailto:${replyEmailAddress}?subject=Response to Peels Newsletter Issue 2`}
        >
          Reach out
        </EmailLink>{" "}
        if you or someone you know can{" "}
        <EmailTextEmphasized>help spread the word locally</EmailTextEmphasized>.
      </EmailParagraph>
      <EmailParagraph>
        If you know someone who hasn’t made a listing yet,{" "}
        <EmailTextEmphasized>encourage them to create one</EmailTextEmphasized>.
        If they’re a would-be donor,{" "}
        <EmailTextEmphasized>
          encourage them to reach out and organise a drop-off
        </EmailTextEmphasized>
        . This helps nearby hosts feel confident creating a listing, and it
        helps us make the case for more local government promotion.
      </EmailParagraph>
      <EmailParagraph>
        Technical contributions are also welcome. If you can help with bugs (the
        software kind) or language translation, check out the{" "}
        <EmailLink href={`${repoUrl}/discussions`}>discussions</EmailLink> and
        open <EmailLink href={`${repoUrl}/issues`}>issues</EmailLink>.
      </EmailParagraph>
      {/* Sign-off */}
      <EmailHr />
      <EmailParagraph>
        Got ideas or feedback?{" "}
        <EmailLink
          href={`mailto:${replyEmailAddress}?subject=Response to Peels Newsletter Issue 2`}
        >
          Drop me a line
        </EmailLink>
        .
      </EmailParagraph>
      <EmailParagraph>
        Happy composting,
        <br />
        Danny from Peels
      </EmailParagraph>
    </EmailBody>
  );
};

export default NewsletterIssueTwoEmail;
