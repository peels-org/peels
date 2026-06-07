import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend";
import { NewsletterIssueEmail } from "../_templates/newsletter-issue-email.tsx";
import {
  getNewsletterEmailSubject,
  resolveNewsletterLocale,
} from "../_shared/newsletter.ts";
import { isMissingPreferredLocaleColumn } from "../_shared/postgrest.ts";
import { renderEmailHtml, renderEmailText } from "../_shared/email-html.ts";
import { getPublicSiteUrl } from "../_shared/app-origin.ts";

// Look up required API keys from Supabase secrets
const generalEmailAddress = Deno.env.get("GENERAL_EMAIL_ADDRESS");
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const resend = new Resend(RESEND_API_KEY);
const publicSiteUrl = getPublicSiteUrl();

// TEST MODE: Set to true to send emails to test address and skip database updates
const TEST_MODE = false;
const TEST_EMAIL = "test@example.com";

// This edge function handles the sending of newsletter issues to Peels users
// who opted-in to the newsletter after sign-up or later on in their profile
const handler = async (_request: Request): Promise<Response> => {
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (
      !supabaseUrl ||
      !supabaseServiceKey ||
      !RESEND_API_KEY ||
      !generalEmailAddress
    ) {
      throw new Error("Missing required environment variables");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // First, get all profiles that are opted-in to the newsletter
    // And have not yet been emailed this issue
    // In TEST_MODE, only get 1 profile to send a single test email
    let profiles: Array<{
      id: string;
      first_name: string | null;
      preferred_locale?: string | null;
    }> | null = null;
    let profilesError: {
      message: string;
    } | null = null;

    const profilesWithLocaleResult = await supabase
      .from("profiles")
      .select("id, first_name, preferred_locale")
      .eq("is_newsletter_subscribed", true)
      .eq("emailed_latest_issue", false)
      .limit(TEST_MODE ? 1 : 30);

    if (
      profilesWithLocaleResult.error &&
      isMissingPreferredLocaleColumn(profilesWithLocaleResult.error)
    ) {
      const fallbackProfilesResult = await supabase
        .from("profiles")
        .select("id, first_name")
        .eq("is_newsletter_subscribed", true)
        .eq("emailed_latest_issue", false)
        .limit(TEST_MODE ? 1 : 30);

      profiles = fallbackProfilesResult.data;
      profilesError = fallbackProfilesResult.error;
    } else {
      profiles = profilesWithLocaleResult.data;
      profilesError = profilesWithLocaleResult.error;
    }

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    const profilesToProcess = profiles ?? [];

    console.log(`Found ${profilesToProcess.length} profiles to process`);

    // Process each profile
    const results = [];
    for (const profile of profilesToProcess) {
      try {
        // Get user email from auth
        const { data: userData, error: userError } =
          await supabase.auth.admin.getUserById(profile.id);

        if (userError) {
          console.error(
            `Failed to fetch user data for ${profile.id}:`,
            userError
          );
          results.push({
            userId: profile.id,
            success: false,
            error: userError.message,
          });
          continue;
        }

        const userEmail = userData?.user?.email;
        if (!userEmail) {
          console.error(`No email found for user ${profile.id}`);
          results.push({
            userId: profile.id,
            success: false,
            error: "No email found",
          });
          continue;
        }

        console.log(`Processing: ${profile.first_name} (${userEmail})`);

        const locale = resolveNewsletterLocale(
          profile.preferred_locale ??
            (typeof userData?.user?.user_metadata?.preferred_locale === "string"
              ? userData.user.user_metadata.preferred_locale
              : null)
        );
        const email = NewsletterIssueEmail({
          locale,
          recipientName: profile.first_name || "there",
          externalAudience: false,
        });
        const html = await renderEmailHtml(email);
        const text = await renderEmailText(email);

        // Add delay to respect rate limit (at most 2 per second)
        await new Promise((resolve) => setTimeout(resolve, 750));

        // Determine recipient email based on test mode
        const recipientEmail = TEST_MODE ? TEST_EMAIL : userEmail;
        if (TEST_MODE) {
          console.log(
            `TEST MODE: Would email ${userEmail}, but sending to ${TEST_EMAIL} instead`
          );
        }

        const { data: _data, error } = await resend.emails.send({
          from: `Danny from Peels <${generalEmailAddress}>`,
          to: [recipientEmail],
          subject: getNewsletterEmailSubject(locale),
          html,
          text,
          headers: {
            "List-Unsubscribe": `<${publicSiteUrl}/profile>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click", // Required for deliverability, even if irrelevant
          },
        });

        if (error) {
          console.error(`Failed to send email to ${recipientEmail}:`, error);
          results.push({
            userId: profile.id,
            email: userEmail,
            success: false,
            error: error.message,
          });
          continue;
        }

        // Only update the flag if email was successful AND not in test mode
        if (!TEST_MODE) {
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ emailed_latest_issue: true })
            .eq("id", profile.id);

          if (updateError) {
            console.error(
              `Failed to update flag for ${profile.id}:`,
              updateError
            );
            results.push({
              userId: profile.id,
              email: userEmail,
              success: false,
              error: updateError.message,
            });
            continue;
          }
        } else {
          console.log(`TEST MODE: Skipping database update for ${profile.id}`);
        }

        results.push({
          userId: profile.id,
          email: userEmail,
          success: true,
        });

        // In TEST_MODE, break after first successful email
        if (TEST_MODE) {
          console.log("TEST MODE: Sent one test email, stopping");
          break;
        }
      } catch (error) {
        console.error(`Error processing profile ${profile.id}:`, error);
        results.push({
          userId: profile.id,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return new Response(
      JSON.stringify({
        processed: results.length,
        results,
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
