import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "npm:resend";
import { NewsletterIssueEmail } from "../_templates/newsletter-issue-email.tsx";
import {
  getNewsletterAudienceConfigs,
  getNewsletterEmailSubject,
} from "../_shared/newsletter.ts";
import { renderEmailHtml, renderEmailText } from "../_shared/email-html.ts";

const generalEmailAddress = Deno.env.get("GENERAL_EMAIL_ADDRESS");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);

// This edge function handles the sending of newsletter issues to external folks
// who don't have a Peels account, such as council or external waste educators
const handler = async (_request: Request): Promise<Response> => {
  try {
    if (!RESEND_API_KEY || !generalEmailAddress) {
      throw new Error("Missing required environment variables");
    }

    console.log("Creating broadcast for Resend audience...");

    const audienceConfigs = getNewsletterAudienceConfigs();

    const broadcasts = [];

    for (const { locale, audienceId } of audienceConfigs) {
      const reactEmail = NewsletterIssueEmail({
        locale,
        recipientName: "{{{FIRST_NAME|there}}}",
        externalAudience: true,
      });
      const textEmail = NewsletterIssueEmail({
        locale,
        recipientName: "there",
        externalAudience: true,
      });
      const html = await renderEmailHtml(reactEmail);
      const text = await renderEmailText(textEmail);

      const { data: broadcast, error: broadcastError } =
        await resend.broadcasts.create({
          audienceId,
          from: `Danny from Peels <${generalEmailAddress}>`,
          subject: getNewsletterEmailSubject(locale),
          html,
          text,
          headers: {
            "List-Unsubscribe": "{{{RESEND_UNSUBSCRIBE_URL}}}",
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });

      if (broadcastError) {
        throw broadcastError;
      }

      console.log(`Broadcast created for locale ${locale}, sending...`);

      const { data: sendData, error: sendError } = await resend.broadcasts.send(
        broadcast.id
      );

      if (sendError) {
        throw sendError;
      }

      broadcasts.push({
        locale,
        audienceId,
        broadcastId: broadcast.id,
        sendData,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        broadcasts,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};

serve(handler);
