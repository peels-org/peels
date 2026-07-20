// Shared listing types mirroring the Supabase public listing and authenticated
// listing contact read models. Used by the map feature and the listings pages.

export type ListingType = "business" | "community" | "residential";

export type ListingCoordinates = {
  latitude: number;
  longitude: number;
};

export type ListingWriteFieldErrors = Partial<
  Record<"name" | "location", string>
>;

export type ListingWriteProfile = {
  first_name?: string | null;
  avatar?: string | null;
  is_admin?: boolean | null;
};

export type ListingDraftInput = {
  id?: number;
  owner_id: string;
  type: ListingType;
  avatar?: string;
  name?: string | null;
  description: string;
  location: string;
  area_name: string;
  country_code: string | null;
  accepted_items: string[];
  rejected_items: string[];
  photos: string[];
  links: string[];
  is_stub?: boolean;
  visibility: boolean;
};

export type ListingSubmitResult = {
  created: boolean;
  id: number;
  redirectTo: string;
  slug: string;
  type: ListingType;
};

export type ListingSubmitFailureData = {
  errors: ListingWriteFieldErrors;
};

export type DeleteListingResult = {
  message: string;
  redirectTo: string;
  slug: string;
};

/**
 * Shape of a listing read model row. Owner-scoped fields are only populated on
 * authenticated listing contact rows and therefore optional.
 */
export interface Listing {
  id: number;
  created_at?: string;
  name: string | null;
  description: string | null;
  accepted_items: string[] | null;
  rejected_items: string[] | null;
  donated_items?: string[] | null;
  photos: string[] | null;
  links: string[] | null;
  type: ListingType | null;
  avatar: string | null;
  slug: string;
  coordinates: ListingCoordinates | null;
  country_code: string | null;
  area_name: string | null;
  is_stub: boolean | null;
  homepage_featured?: boolean | null;
  homepage_featured_photo_indexes?: number[] | null;
  owner_has_multiple_non_residential_listings: boolean | null;
  // Private view only
  owner_id?: string | null;
  visibility?: boolean | null;
  owner_first_name?: string | null;
  owner_avatar?: string | null;
}

/** Error sentinel produced when a listing cannot be resolved from a slug/id. */
export type ListingError = {
  error: true;
  message: string;
};

/** Either a fully-resolved listing or an error sentinel. */
export type SelectedListing = Listing | ListingError;

export function isListingError(
  value: SelectedListing | null | undefined
): value is ListingError {
  return Boolean(value) && (value as ListingError).error === true;
}

export function isListing(
  value: SelectedListing | null | undefined
): value is Listing {
  return Boolean(value) && (value as ListingError).error !== true;
}

/** Shape returned by the `listings_in_view` RPC — map markers only. */
export type ListingMarker = {
  id: number;
  slug: string;
  type: ListingType | null;
  coordinates: ListingCoordinates | null;
};

/**
 * Demo listings used by `PeelsMapDemo`. These don't come from the database, so
 * they're a loose subset of `Listing`. Handled by `ListingRead` when
 * `presentation === "demo"`.
 */
export interface DemoListing {
  is_demo: true;
  type: ListingType;
  name?: string;
  owner_first_name?: string;
  avatar?: string;
  description?: string;
  accepted_items?: string[];
  rejected_items?: string[];
  area_name?: string;
  map_position?: { x: number; y: number };
}
