import { createClient } from "@/utils/supabase/server";
import FormHeader from "@/components/FormHeader";
import ListingWrite from "@/components/ListingWrite";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

type EditListingPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const metadata: Metadata = {
  title: "Edit Listing",
};

const listingEditSelect = `
  id,
  owner_id,
  owner_first_name,
  avatar,
  name,
  description,
  coordinates,
  country_code,
  area_name,
  accepted_items,
  rejected_items,
  photos,
  links,
  type,
  slug,
  is_stub,
  visibility,
  owner_has_multiple_non_residential_listings
`;

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  const supabasePromise = createClient();
  const { slug } = await params;
  const supabase = await supabasePromise;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirect_to=/profile/listings/${slug}`);
  }

  const [
    t,
    { data: profile, error: profileError },
    { data: ownedListing, error: ownedListingError },
  ] = await Promise.all([
    getTranslations(),
    supabase
      .from("profiles")
      .select("first_name, avatar, is_admin")
      .eq("id", user.id)
      .single(),
    supabase
      .from("listing_contact_cards")
      .select(listingEditSelect)
      .eq("owner_id", user.id)
      .match({ slug })
      .maybeSingle(),
  ]);

  if (profileError) {
    throw new Error(
      `Failed to fetch profile for user "${user.id}": ${profileError.message}`
    );
  }

  if (ownedListingError) {
    throw new Error(
      `Failed to fetch listing for slug "${slug}" and user "${user.id}": ${ownedListingError.message}`
    );
  }

  let listing = ownedListing;

  if (!listing && profile?.is_admin) {
    const { data: adminListing, error: adminListingError } = await supabase
      .from("listing_contact_cards")
      .select(listingEditSelect)
      .match({ slug })
      .maybeSingle();

    if (adminListingError) {
      throw new Error(
        `Failed to fetch listing for slug "${slug}" as admin "${user.id}": ${adminListingError.message}`
      );
    }

    listing = adminListing;
  }

  if (!listing) {
    return <div>{t("Listings.edit.notFound")}</div>;
  }

  return (
    <>
      <FormHeader button="back">
        <h1>{t("Listings.edit.title")}</h1>
      </FormHeader>

      <ListingWrite initialListing={listing} user={user} profile={profile} />
    </>
  );
}
