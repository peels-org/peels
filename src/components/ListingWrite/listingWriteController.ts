import {
  createOrUpdateListingAction,
  deleteListingAction,
  updateFirstNameAction,
} from "@/app/actions";
import {
  validateFirstName,
  validateName,
  type FirstNameErrorCode,
} from "@/lib/formValidation";
import type { Dispatch, SetStateAction } from "react";
import type { InlineActionResult } from "@/types/actionResult";
import type {
  DeleteListingResult,
  Listing,
  ListingCoordinates,
  ListingDraftInput,
  ListingSubmitFailureData,
  ListingSubmitResult,
  ListingType,
  ListingWriteFieldErrors,
  ListingWriteProfile,
} from "@/types/listing";
import { normaliseListingCountryCode } from "@/utils/listingCountry";

export type ListingWriteFormValues = {
  acceptedItems: string[];
  areaName: string;
  avatar: string;
  coordinates: ListingCoordinates | null;
  countryCode: string;
  description: string;
  isStub: boolean;
  links: string[];
  name: string;
  pendingPhotos: string[];
  photos: string[];
  rejectedItems: string[];
  visibility: boolean;
};

type Translate = (
  key: string,
  values?: Record<string, string | number | Date>
) => string;

export type LocationSelectProps = {
  listingType: string;
  coordinates: ListingCoordinates | null;
  setCoordinates: Dispatch<SetStateAction<ListingCoordinates | null>>;
  countryCode: string;
  setCountryCode: Dispatch<SetStateAction<string>>;
  areaName: string;
  setAreaName: Dispatch<SetStateAction<string>>;
  initialPlaceholderText?: string;
  autoDetectCountry?: boolean;
  onLocationInteract?: () => void;
  error?: string;
};

function translateFirstNameFieldError(t: Translate, code?: FirstNameErrorCode) {
  switch (code) {
    case "empty":
      return t("Errors.emptyName");
    case "tooShort":
      return t("Errors.firstNameTooShort");
    case "tooLong":
      return t("Errors.firstNameTooLong");
    case "forbiddenContent":
    case "reserved":
      return t("Errors.firstNameNotAllowed");
    case "invalidChars":
      return t("Errors.firstNameInvalidChars");
    default:
      return t("Errors.generic");
  }
}

export function validateListingWriteForm({
  coordinates,
  listingType,
  name,
  profile,
  t,
}: {
  coordinates: ListingCoordinates | null;
  listingType: ListingType;
  name: string;
  profile: ListingWriteProfile | null;
  t: Translate;
}): {
  errors: ListingWriteFieldErrors;
  validatedName: string;
} {
  const errors: ListingWriteFieldErrors = {};
  let validatedName = name;

  if (listingType === "residential") {
    if (name !== profile?.first_name) {
      const validation = validateFirstName(name);

      if (!validation.isValid) {
        errors.name = translateFirstNameFieldError(t, validation.error);
      } else {
        validatedName = validation.value ?? "";
      }
    }
  } else {
    const validation = validateName(name);

    if (!validation.isValid) {
      errors.name = t("Errors.emptyListingName", { type: listingType });
    } else {
      validatedName = validation.value ?? "";
    }
  }

  if (!coordinates) {
    errors.location = t("Errors.missingLocation");
  }

  return {
    errors,
    validatedName,
  };
}

export function buildListingDraft({
  initialListing,
  listingType,
  profile,
  userId,
  validatedName,
  values,
}: {
  initialListing?: Listing | null;
  listingType: ListingType;
  profile: ListingWriteProfile | null;
  userId: string;
  validatedName: string;
  values: ListingWriteFormValues;
}): ListingDraftInput | null {
  if (!values.coordinates) {
    return null;
  }

  return {
    ...(initialListing && { id: initialListing.id }),
    owner_id: userId,
    type: listingType,
    ...(listingType !== "residential" &&
      values.avatar && { avatar: values.avatar }),
    name: listingType === "residential" ? null : validatedName,
    description: values.description,
    location: `POINT(${values.coordinates.longitude} ${values.coordinates.latitude})`,
    area_name: values.areaName,
    country_code: normaliseListingCountryCode(values.countryCode),
    accepted_items: values.acceptedItems.filter((item) => item.trim() !== ""),
    rejected_items: values.rejectedItems.filter((item) => item.trim() !== ""),
    photos: initialListing ? values.photos : values.pendingPhotos,
    links: values.links.filter((link) => link.trim() !== ""),
    ...(profile?.is_admin && { is_stub: values.isStub }),
    visibility: values.visibility,
  };
}

export async function submitListingWrite({
  draft,
  fallbackError,
  listingType,
  profile,
  validatedName,
  t,
}: {
  draft: ListingDraftInput | null;
  fallbackError: string;
  listingType: ListingType;
  profile: ListingWriteProfile | null;
  validatedName: string;
  t: Translate;
}): Promise<
  InlineActionResult<ListingSubmitResult | ListingSubmitFailureData>
> {
  if (!draft) {
    return {
      success: false,
      error: fallbackError,
    };
  }

  if (listingType === "residential" && profile?.first_name !== validatedName) {
    const formData = new FormData();
    formData.append("first_name", validatedName);

    const result = await updateFirstNameAction(formData);

    if (result?.error) {
      const nameError = String(result.error);

      return {
        success: false,
        error: nameError,
        data: {
          errors: {
            name: nameError,
          },
        },
      };
    }
  }

  return createOrUpdateListingAction(draft);
}

export async function submitListingDelete({
  slug,
}: {
  slug: string;
}): Promise<InlineActionResult<DeleteListingResult>> {
  return deleteListingAction(slug);
}
