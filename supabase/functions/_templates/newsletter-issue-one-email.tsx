import { Section, Column, Row } from "npm:@react-email/components";
import EmailBody from "./components/EmailBody.tsx";
import EmailAside from "./components/EmailAside.tsx";
import EmailImage from "./components/EmailImage.tsx";
import EmailHeading from "./components/EmailHeading.tsx";
import EmailParagraph from "./components/EmailParagraph.tsx";
import EmailCaption from "./components/EmailCaption.tsx";
import EmailTextEmphasized from "./components/EmailTextEmphasized.tsx";
import EmailLink from "./components/EmailLink.tsx";
import EmailHr from "./components/EmailHr.tsx";
import { getPublicSiteUrl } from "../_shared/app-origin.ts";
import * as React from "npm:react";

interface NewsletterIssueOneEmailProps {
  recipientName: string;
  externalAudience: boolean;
}

const replyEmailAddress = Deno.env.get("GENERAL_EMAIL_ADDRESS");
const staticAssetUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/static`;
const issueSlug = "celebrating-the-first-few-months";

// An email template for newsletter issues, both to opted-in users and broadcast audiences
// Make a new copy for each new newsletter issue so contents aren't overridden (and can be borrowed for future issues)
export const NewsletterIssueOneEmail = ({
  recipientName = "there",
  externalAudience,
}: NewsletterIssueOneEmailProps) => {
  const siteUrl = getPublicSiteUrl();
  const repoUrl = "https://github.com/dnywh/peels";
  const issueAssetUrl = `${staticAssetUrl}/newsletter/1`;
  return (
    <EmailBody
      previewText={`It’s been a big first few months of Peels. Here’s an update on what happened and what we’re working towards.`}
      headingText={`Celebrating the first few months of Peels`}
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
        Welcome to the first issue of the Peels newsletter. As a reminder,{" "}
        <EmailLink href={siteUrl}>Peels</EmailLink> is a volunteer-led community
        composting platform that launched in January this year.
      </EmailParagraph>

      <EmailParagraph>
        We’ll be sending out updates 2–3 times a year, with a focus on how Peels
        supports community composting around the world.
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

      {/* Major section 1 of 2 */}

      <EmailHr />

      <EmailHeading as="h2">What’s new</EmailHeading>

      <EmailParagraph>
        Peels started in January with zero composters and zero publicity. Since
        then (thanks to folks like you),{" "}
        <EmailTextEmphasized>
          we now have almost 300 listings
        </EmailTextEmphasized>{" "}
        around the world.
      </EmailParagraph>

      <EmailImage
        alt="A map showing all the Peels host pins around the world"
        height={232}
        src={`${issueAssetUrl}/peels-map.jpg`}
        caption="A world map of Peels hosts, including far-flung places like Portugal, Hawaii, Alaska, Peru, Hungary, and Argentina."
      />

      <EmailParagraph>
        Most of our hosts are in Australia and the USA, but we’re also seeing
        compost communities spring up in New Zealand and the UK.
      </EmailParagraph>

      <EmailParagraph>
        Below are just a few of our lovely hosts who happen have photos on their
        listings:
      </EmailParagraph>

      <Section style={{ margin: "40px 0" }}>
        <Row>
          <Column style={gridImgColLeft}>
            <EmailImage
              alt="A woman holding a pumpkin in her garden"
              height={148}
              src={`${issueAssetUrl}/kirrily.jpg`}
              margin={false}
            />
          </Column>
          <Column style={gridImgColRight}>
            <EmailImage
              alt="Two women in front of a compost collection point"
              height={148}
              src={`${issueAssetUrl}/seed-the-ground.jpg`}
              margin={false}
            />
          </Column>
        </Row>
        <Row style={{ marginTop: "16px" }}>
          <Column style={gridImgColLeft}>
            <EmailImage
              alt="A light-industrial building with 'Shellworks' signage"
              height={148}
              src={`${issueAssetUrl}/shellworks.jpg`}
              margin={false}
            />
          </Column>
          <Column style={gridImgColRight}>
            <EmailImage
              alt="A woman at a compost information stall"
              height={148}
              src={`${issueAssetUrl}/scrapdogs.jpg`}
              margin={false}
            />
          </Column>
        </Row>
        <Row style={{ marginTop: "16px" }}>
          <Column style={gridImgColLeft}>
            <EmailImage
              alt="Two people happily turning a compost pile"
              height={148}
              src={`${issueAssetUrl}/lets-grow-preston.jpg`}
              margin={false}
            />
          </Column>
          <Column style={gridImgColRight}>
            <EmailImage
              alt="A thriving vegetable garden with compost bays at the back"
              height={148}
              src={`${issueAssetUrl}/jake.jpg`}
              margin={false}
            />
          </Column>
        </Row>
        <EmailCaption>
          Clockwise from top-left: Kirrily in Broome,{" "}
          <EmailLink href={`${siteUrl}/map?listing=YsJerEnaUVjv`}>
            Seed the Ground
          </EmailLink>{" "}
          on the Gold Coast,{" "}
          <EmailLink href={`${siteUrl}/map?listing=0WhK28YBfSSS`}>
            ScrapDogs
          </EmailLink>{" "}
          in Maine, Jake in Colorado,{" "}
          <EmailLink href={`${siteUrl}/map?listing=MG92x2GOAeXj`}>
            Let’s Grow Preston
          </EmailLink>
          , and{" "}
          <EmailLink href={`${siteUrl}/map?listing=FjABURjzHDMW`}>
            Shellworks
          </EmailLink>{" "}
          in London.
        </EmailCaption>
      </Section>

      <EmailParagraph>
        If you’re a Peels host and haven’t yet been contacted, thanks for your
        patience. Donor sign ups are growing steadily. In the meantime,{" "}
        <EmailTextEmphasized>
          consider adding a photo to your listing
        </EmailTextEmphasized>
        . Photos help donors feel more confident about reaching out.
      </EmailParagraph>

      <EmailHeading as="h3">A deeper dive</EmailHeading>

      <EmailParagraph>
        If you want to hear more about Peels’ first few months and how it
        relates to community composting more broadly, check out{" "}
        <EmailLink href="https://loccal.org/2025/05/06/the-loccal-loop-icaw-edition-may-2025-newsletter/">
          this LOCCAL event
        </EmailLink>{" "}
        that I (Danny) recently spoke at. You can skip to the 28 minute mark or,
        alternatively, flick through{" "}
        <EmailLink href="https://loccal.org/2025/05/21/putting-community-composting-on-the-map-with-peels/">
          the written version
        </EmailLink>
        .
      </EmailParagraph>

      <EmailParagraph>
        I’d love to hear from you:{" "}
        <EmailTextEmphasized>what are your ideas</EmailTextEmphasized> for
        reaching more would-be composters?{" "}
        <EmailTextEmphasized>
          What’s happening in your community
        </EmailTextEmphasized>{" "}
        that Peels could better support?
      </EmailParagraph>

      {/* Major section 2 of 2 */}

      <EmailHr />

      <EmailHeading as="h2">What’s next</EmailHeading>

      <EmailParagraph>
        Peels is growing but we can’t do it alone. We’re looking for fellow
        volunteers to help with{" "}
        <EmailTextEmphasized>community outreach</EmailTextEmphasized> and{" "}
        <EmailTextEmphasized>technical contributions</EmailTextEmphasized>.
      </EmailParagraph>

      <EmailHeading as="h3">Community outreach</EmailHeading>

      <EmailParagraph>
        Many would-be compost donors and hosts simply haven’t heard about Peels.
        As a team of one (sometimes two), our outreach is limited.
      </EmailParagraph>

      <EmailParagraph>
        <EmailTextEmphasized>
          Please{" "}
          <EmailLink
            href={`mailto:${replyEmailAddress}?subject=Response to Peels Newsletter Issue 1`}
          >
            reach out
          </EmailLink>{" "}
          if you or someone you know can help promote Peels in your local area.
        </EmailTextEmphasized>{" "}
        Whether it’s to councils, waste educators, or local networks, any help
        is appreciated. Our{" "}
        <EmailLink href={`${siteUrl}/share`}>Share page</EmailLink> is also a
        good place to start.
      </EmailParagraph>

      <EmailHeading as="h3">Technical contributions</EmailHeading>

      <EmailParagraph>
        Peels is now open source! That means{" "}
        <EmailTextEmphasized>
          the 
          <EmailLink href={repoUrl}>source code is public</EmailLink>,
          documented, and ready for contributions
        </EmailTextEmphasized>
        . We had our first community contribution just the other day from Hugo
        in Canada.
      </EmailParagraph>

      <EmailImage
        alt="The Peels GitHub repository"
        height={248}
        src={`${issueAssetUrl}/github-repo.png`}
        caption={
          <>
            Help us spread the word about Peels to your community, or get stuck
            in to <EmailLink href={repoUrl}>the code</EmailLink>!
          </>
        }
      />

      <EmailParagraph>
        You don’t need to write code to contribute to the ‘product’. For
        example, we’re tackling{" "}
        <EmailLink href={`${repoUrl}/discussions/4`}>a tricky issue</EmailLink>{" "}
        with how people are using the donor listing category in unexpected ways.{" "}
        <EmailTextEmphasized>
          Got ideas?{" "}
          <EmailLink href={`${repoUrl}/discussions`}>
            Join the discussion
          </EmailLink>
          !
        </EmailTextEmphasized>
      </EmailParagraph>

      {/* Sign-off */}

      <EmailHr />

      <EmailParagraph>
        Finally, if you know someone who has yet to make a listing or hasn’t
        reached out about a drop-off,{" "}
        <EmailTextEmphasized>
          please encourage them to do so
        </EmailTextEmphasized>
        .
      </EmailParagraph>

      <EmailParagraph>
        Thanks for reading. What would you like to see more (or less) of on
        Peels or in future newsletter issues? I’d love to hear your thoughts.
      </EmailParagraph>

      <EmailParagraph>
        Happy composting,
        <br />
        Danny from Peels
      </EmailParagraph>
    </EmailBody>
  );
};

export default NewsletterIssueOneEmail;

const gridImgColLeft = { width: "50%", paddingRight: 8 };
const gridImgColRight = { width: "50%", paddingLeft: 8 };
