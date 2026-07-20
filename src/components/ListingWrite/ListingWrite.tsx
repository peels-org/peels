"use client";

import { theme } from "@/styles/theme.yak";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ComponentType,
  type InputHTMLAttributes,
} from "react";
import { useRouter } from "next/navigation";
import { FIELD_CONFIGS } from "@/lib/formValidation";
import LocationSelect from "@/components/LocationSelect";
import CheckboxCluster from "@/components/CheckboxCluster";
import LegalAgreement from "@/components/LegalAgreement";
import Form from "@/components/Form";
import FormSection from "@/components/FormSection";
import FormSectionHeader from "@/components/FormSectionHeader";
import Field from "@/components/Field";
import Label from "@/components/Label";
import Input from "@/components/Input";
import Select from "@/components/Select";
import Button from "@/components/Button";
import Textarea from "@/components/Textarea";
import MultiInput from "@/components/MultiInput";
import AvatarUploadManager from "@/components/AvatarUploadManager";
import ButtonToDialog from "@/components/ButtonToDialog";
import ListingPhotosManager from "@/components/ListingPhotosManager";
import InputHint from "@/components/InputHint";
import Fieldset from "@/components/Fieldset";
import Lozenge from "@/components/Lozenge";
import FormMessage from "@/components/FormMessage";
import SubmitButton from "@/components/SubmitButton";
import { useBeforeUnloadWarning } from "@/hooks/useBeforeUnloadWarning";
import { styled } from "next-yak";
import { useTranslations } from "next-intl";
import type { User } from "@supabase/supabase-js";
import { useInlineMutation } from "@/hooks/useInlineMutation";
import { normaliseListingCountryCode } from "@/utils/listingCountry";
import {
  buildListingDraft,
  submitListingDelete,
  submitListingWrite,
  type ListingWriteFormValues,
  type LocationSelectProps,
  validateListingWriteForm,
} from "@/components/ListingWrite/listingWriteController";
import type {
  DeleteListingResult,
  Listing,
  ListingCoordinates,
  ListingSubmitFailureData,
  ListingSubmitResult,
  ListingType,
  ListingWriteFieldErrors,
  ListingWriteProfile,
} from "@/types/listing";
import type { FormSubmitEvent } from "@/types/events";

const DESCRIPTION_MAX_CHARACTERS = 640;

const FieldsetWithGap = styled(Fieldset)`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const AdditionalSettings = styled.footer`
  width: 100%;
  border-top: 1px solid ${theme.colors.border.base};
  padding-top: calc(${theme.spacing.unit} * 3);
  display: flex;
  flex-direction: column;
  gap: calc(${theme.spacing.unit} * 1.5);
`;

const DisabledFieldset = styled.fieldset`
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-width: 0;
  border: 0;
  margin: 0;
  padding: 0;
`;

const LocationSelectComponent =
  LocationSelect as ComponentType<LocationSelectProps>;
const InputComponent = Input as ComponentType<
  InputHTMLAttributes<HTMLInputElement> & {
    error?: string | null;
  }
>;

type ListingWriteProps = {
  initialListing?: Listing | null;
  listingType?: ListingType;
  user: User | null;
  profile: ListingWriteProfile | null;
};

type ListingWriteSavedValues = {
  acceptedItems: string[];
  areaName: string;
  avatar: string;
  coordinates: ListingCoordinates | null;
  countryCode: string;
  description: string;
  isStub: boolean;
  links: string[];
  name: string;
  photos: string[];
  rejectedItems: string[];
  visibility: boolean;
};

function normalizeTextList(items: string[] | null | undefined) {
  return (items ?? []).filter((item) => item.trim() !== "");
}

function getListingWriteSavedValues({
  acceptedItems,
  areaName,
  avatar,
  coordinates,
  countryCode,
  description,
  isStub,
  links,
  listingType,
  name,
  photos,
  profile,
  rejectedItems,
  visibility,
}: {
  acceptedItems: string[] | null | undefined;
  areaName: string | null | undefined;
  avatar: string | null | undefined;
  coordinates: ListingCoordinates | null;
  countryCode: string | null | undefined;
  description: string | null | undefined;
  isStub: boolean | null | undefined;
  links: string[] | null | undefined;
  listingType: ListingType;
  name: string | null | undefined;
  photos: string[] | null | undefined;
  profile: ListingWriteProfile | null;
  rejectedItems: string[] | null | undefined;
  visibility: boolean | null | undefined;
}): ListingWriteSavedValues {
  return {
    acceptedItems: normalizeTextList(acceptedItems),
    areaName: areaName || "",
    avatar: listingType === "residential" ? "" : avatar || "",
    coordinates,
    countryCode: countryCode || "",
    description: description || "",
    isStub: Boolean(isStub),
    links: listingType === "residential" ? [] : normalizeTextList(links),
    name:
      listingType === "residential" ? profile?.first_name || "" : name || "",
    photos: photos ?? [],
    rejectedItems: normalizeTextList(rejectedItems),
    visibility: visibility ?? true,
  };
}

export default function ListingWrite({
  initialListing,
  listingType: initialListingType,
  user,
  profile,
}: ListingWriteProps) {
  const t = useTranslations();
  const router = useRouter();
  const [isHydrated, setIsHydrated] = useState(false);
  const listingType =
    initialListing?.type || initialListingType || "residential";
  const submitMutation = useInlineMutation<
    ListingSubmitResult | ListingSubmitFailureData
  >();
  const deleteMutation = useInlineMutation<DeleteListingResult>();

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const [errors, setErrors] = useState<ListingWriteFieldErrors>({});
  const [avatar, setAvatar] = useState<string>(
    initialListing ? initialListing.avatar || "" : ""
  );
  const [name, setName] = useState<string>(
    listingType === "residential"
      ? profile?.first_name || ""
      : initialListing?.name || ""
  );
  const [description, setDescription] = useState<string>(
    initialListing?.description || ""
  );
  const [countryCode, setCountryCode] = useState<string>(
    normaliseListingCountryCode(initialListing?.country_code) || ""
  );
  const [coordinates, setCoordinates] = useState(
    initialListing?.coordinates ?? null
  );
  const [areaName, setAreaName] = useState<string>(
    initialListing?.area_name || ""
  );
  const [acceptedItems, setAcceptedItems] = useState<string[]>(
    initialListing?.accepted_items || [""]
  );
  const [rejectedItems, setRejectedItems] = useState<string[]>(
    initialListing?.rejected_items || []
  );
  const [photos, setPhotos] = useState<string[]>(initialListing?.photos || []);
  const [links, setLinks] = useState<string[]>(initialListing?.links || []);
  const [visibility, setVisibility] = useState<boolean>(
    initialListing?.visibility ?? true
  );
  const [isStub, setIsStub] = useState<boolean>(
    initialListing?.is_stub ?? false
  );
  const [pendingPhotos, setPendingPhotos] = useState<string[]>([]);
  const [hasInteractedWithForm, setHasInteractedWithForm] = useState(false);
  const markFormInteracted = useCallback(() => {
    setHasInteractedWithForm(true);
  }, []);

  const isMutating = submitMutation.isPending || deleteMutation.isPending;
  const initialListingValues = useMemo(
    () =>
      initialListing
        ? getListingWriteSavedValues({
            acceptedItems: initialListing.accepted_items,
            areaName: initialListing.area_name,
            avatar: initialListing.avatar,
            coordinates: initialListing.coordinates,
            countryCode:
              normaliseListingCountryCode(initialListing.country_code) || "",
            description: initialListing.description,
            isStub: initialListing.is_stub,
            links: initialListing.links,
            listingType,
            name: initialListing.name,
            photos: initialListing.photos,
            profile,
            rejectedItems: initialListing.rejected_items,
            visibility: initialListing.visibility,
          })
        : getListingWriteSavedValues({
            acceptedItems: [""],
            areaName: "",
            avatar: "",
            coordinates: null,
            countryCode: "",
            description: "",
            isStub: false,
            links: [],
            listingType,
            name: listingType === "residential" ? profile?.first_name : "",
            photos: [],
            profile,
            rejectedItems: [],
            visibility: true,
          }),
    [initialListing, listingType, profile]
  );
  const currentListingValues = useMemo(
    () =>
      getListingWriteSavedValues({
        acceptedItems,
        areaName,
        avatar,
        coordinates,
        countryCode,
        description,
        isStub,
        links,
        listingType,
        name,
        photos: initialListing ? photos : pendingPhotos,
        profile,
        rejectedItems,
        visibility,
      }),
    [
      acceptedItems,
      areaName,
      avatar,
      coordinates,
      countryCode,
      description,
      initialListing,
      isStub,
      links,
      listingType,
      name,
      pendingPhotos,
      photos,
      profile,
      rejectedItems,
      visibility,
    ]
  );
  const initialListingValuesJson = useMemo(
    () => JSON.stringify(initialListingValues),
    [initialListingValues]
  );
  const currentListingValuesJson = useMemo(
    () => JSON.stringify(currentListingValues),
    [currentListingValues]
  );
  const hasUnsavedChanges = useMemo(
    () => initialListingValuesJson !== currentListingValuesJson,
    [currentListingValuesJson, initialListingValuesJson]
  );
  const errorCount = Object.keys(errors).length;
  const feedbackError =
    deleteMutation.result.error || submitMutation.result.error;
  const feedbackMessage =
    feedbackError ||
    (errorCount > 0
      ? t("Errors.validationSummary", {
          count: errorCount,
        })
      : null);

  const shouldWarnBeforeUnload = initialListing
    ? hasUnsavedChanges
    : hasInteractedWithForm && hasUnsavedChanges;

  useBeforeUnloadWarning(Boolean(shouldWarnBeforeUnload && !isMutating));

  async function handleDiscardChanges(event: FormSubmitEvent) {
    event.preventDefault();

    if (!initialListing || isMutating) {
      return;
    }

    router.push(`/listings/${initialListing.slug}`);
  }

  async function handleDeleteListing(event: FormSubmitEvent) {
    event.preventDefault();

    if (!initialListing || isMutating) {
      return;
    }

    setErrors({});
    submitMutation.reset();

    const result = await deleteMutation.run(
      () =>
        submitListingDelete({
          slug: initialListing.slug,
        }),
      {
        fallbackError: t("Errors.generic"),
      }
    );

    if (
      result?.success &&
      result.data &&
      "redirectTo" in result.data &&
      result.data.redirectTo
    ) {
      router.push(result.data.redirectTo);
    }
  }

  async function handleSubmit(event: FormSubmitEvent) {
    event.preventDefault();

    if (isMutating) {
      return;
    }

    setErrors({});
    submitMutation.reset();
    deleteMutation.reset();

    const validation = validateListingWriteForm({
      coordinates,
      listingType,
      name,
      profile,
      t,
    });

    if (Object.keys(validation.errors).length > 0) {
      setErrors(validation.errors);
      return;
    }

    if (!user?.id) {
      submitMutation.setResult({
        success: false,
        error: t("Errors.generic"),
      });
      return;
    }

    const formValues: ListingWriteFormValues = {
      acceptedItems,
      areaName,
      avatar,
      coordinates,
      countryCode,
      description,
      isStub,
      links,
      name,
      pendingPhotos,
      photos,
      rejectedItems,
      visibility,
    };
    const draft = buildListingDraft({
      initialListing,
      listingType,
      profile,
      userId: user.id,
      validatedName: validation.validatedName,
      values: formValues,
    });

    const result = await submitMutation.run(
      () =>
        submitListingWrite({
          draft,
          fallbackError: t("Errors.genericLater"),
          listingType,
          profile,
          validatedName: validation.validatedName,
          t,
        }),
      {
        fallbackError: t("Errors.unexpected"),
      }
    );

    if (!result?.success && result?.data && "errors" in result.data) {
      setErrors(result.data.errors);
    }

    if (
      result?.success &&
      result.data &&
      "redirectTo" in result.data &&
      typeof result.data.redirectTo === "string"
    ) {
      router.push(result.data.redirectTo);
    }
  }

  const addAcceptedItem = () => {
    setAcceptedItems((currentItems) => [...currentItems, ""]);
  };

  const addRejectedItem = () => {
    setRejectedItems((currentItems) => [...currentItems, ""]);
  };

  const addLink = () => {
    setLinks((currentLinks) => [...currentLinks, ""]);
  };

  const handleAcceptedItemChange = (index: number, value: string) => {
    setAcceptedItems((currentItems) => {
      const nextItems = [...currentItems];
      nextItems[index] = value;
      return nextItems;
    });
  };

  const handleRejectedItemChange = (index: number, value: string) => {
    setRejectedItems((currentItems) => {
      const nextItems = [...currentItems];
      nextItems[index] = value;
      return nextItems;
    });
  };

  const handleLinksChange = (index: number, value: string) => {
    setLinks((currentLinks) => {
      const nextLinks = [...currentLinks];
      nextLinks[index] = value;
      return nextLinks;
    });
  };

  const handlePhotosChange = useCallback(
    (nextPhotos: string[]) => {
      markFormInteracted();

      if (initialListing) {
        setPhotos(nextPhotos);
        return;
      }

      setPendingPhotos(nextPhotos);
    },
    [initialListing, markFormInteracted]
  );

  return (
    <>
      {initialListing?.is_stub && <Lozenge>{t("Common.stub")}</Lozenge>}

      <Form
        onSubmit={handleSubmit}
        onChange={markFormInteracted}
        onInput={markFormInteracted}
        data-testid="listing-write-form"
        data-hydrated={isHydrated ? "true" : "false"}
      >
        <DisabledFieldset disabled={isMutating}>
          {listingType !== "residential" && (
            <AvatarUploadManager
              initialAvatar={avatar}
              bucket="listing_avatars"
              entityId={initialListing?.slug ?? ""}
              onAvatarChange={setAvatar}
              listingType={listingType}
            />
          )}

          <FormSection>
            <FormSectionHeader>
              <h2>{t("Listings.form.basics")}</h2>
            </FormSectionHeader>

            {listingType === "residential" ? (
              <Field>
                <Label htmlFor="first_name">
                  {t("Listings.form.yourFirstName")}
                </Label>
                <InputComponent
                  id="first_name"
                  name="first_name"
                  {...FIELD_CONFIGS.firstName}
                  value={name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setName(event.target.value)
                  }
                  error={errors.name ?? null}
                />
                <InputHint variant={errors.name ? "error" : "default"}>
                  {errors.name || t("Profile.account.firstNameHint")}
                </InputHint>
              </Field>
            ) : (
              <Field>
                <Label htmlFor="name">{t("Listings.form.placeName")}</Label>
                <InputComponent
                  id="name"
                  name="name"
                  required={true}
                  type="text"
                  minLength={FIELD_CONFIGS.firstName.minLength}
                  placeholder={t("Listings.form.placeNamePlaceholder", {
                    type: listingType,
                  })}
                  value={name}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    setName(event.target.value)
                  }
                  error={errors.name ?? null}
                />
                {errors.name && (
                  <InputHint variant="error">{errors.name}</InputHint>
                )}
              </Field>
            )}

            <LocationSelectComponent
              listingType={listingType}
              initialPlaceholderText={
                initialListing
                  ? areaName
                  : listingType === "business"
                    ? t("Listings.form.businessAddress")
                    : listingType === "community"
                      ? t("Listings.form.communityAddress")
                      : t("Listings.form.residentialAddress")
              }
              coordinates={coordinates}
              setCoordinates={setCoordinates}
              countryCode={countryCode}
              setCountryCode={setCountryCode}
              areaName={areaName}
              setAreaName={setAreaName}
              autoDetectCountry={!initialListing}
              onLocationInteract={markFormInteracted}
              error={errors.location}
            />

            {listingType === "business" ? (
              <Field>
                <Label htmlFor="description">
                  {t("Listings.form.donationDetails")}
                </Label>
                <Textarea
                  id="description"
                  rows={6}
                  maxLength={DESCRIPTION_MAX_CHARACTERS}
                  required={true}
                  resize="vertical"
                  placeholder={t("Listings.form.donationDetailsPlaceholder")}
                  value={description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(event.target.value)
                  }
                />
                <InputHint>{t("Listings.form.donationDetailsHint")}</InputHint>
              </Field>
            ) : (
              <Field>
                <Label
                  htmlFor="description"
                  required={false}
                  optionalText={t("Common.optional")}
                >
                  {t("Listings.form.descriptionLabel")}
                </Label>
                <Textarea
                  id="description"
                  rows={listingType === "residential" ? 4 : 5}
                  maxLength={DESCRIPTION_MAX_CHARACTERS}
                  required={false}
                  resize="vertical"
                  placeholder={t("Listings.form.descriptionPlaceholder", {
                    type: listingType,
                  })}
                  value={description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    setDescription(event.target.value)
                  }
                />
                <InputHint>
                  {listingType === "community"
                    ? t("Listings.form.communityDescriptionHint")
                    : t("Listings.form.residentialDescriptionHint")}
                </InputHint>
              </Field>
            )}
          </FormSection>

          {(listingType === "residential" || listingType === "community") && (
            <FormSection>
              <FormSectionHeader>
                <h2>{t("Listings.form.compostingDetails")}</h2>
                <p>{t("Listings.form.compostingDetailsHint")}</p>
              </FormSectionHeader>

              <MultiInput
                label={t("Listings.form.acceptedLabel")}
                addButtonText={t("Listings.form.addItem")}
                addAnotherButtonText={t("Listings.form.addAnotherItem")}
                optionalText={t("Common.optional")}
                placeholder={t("Listings.form.acceptedPlaceholder")}
                secondaryPlaceholder={t(
                  "Listings.form.acceptedSecondaryPlaceholder"
                )}
                items={acceptedItems}
                minRequired={1}
                handleItemChange={handleAcceptedItemChange}
                onClick={addAcceptedItem}
                limit={12}
              />

              <MultiInput
                label={t("Listings.form.rejectedLabel")}
                addButtonText={t("Listings.form.addItem")}
                addAnotherButtonText={t("Listings.form.addAnotherItem")}
                optionalText={t("Common.optional")}
                placeholder={t("Listings.form.rejectedPlaceholder")}
                secondaryPlaceholder={t(
                  "Listings.form.rejectedSecondaryPlaceholder"
                )}
                items={rejectedItems}
                handleItemChange={handleRejectedItemChange}
                onClick={addRejectedItem}
                limit={16}
              />
            </FormSection>
          )}

          <FormSection>
            <FormSectionHeader>
              <h2>{t("Listings.form.media")}</h2>
              <p>
                {t("Listings.form.mediaHint", {
                  subject:
                    listingType === "residential"
                      ? t("Listings.form.mediaResidential")
                      : listingType === "community"
                        ? t("Listings.form.mediaCommunity")
                        : t("Listings.form.mediaBusiness"),
                })}
              </p>
            </FormSectionHeader>

            <FieldsetWithGap>
              <Label
                htmlFor="photo-upload-button"
                required={false}
                optionalText={t("Common.optional")}
              >
                {t("Common.photos")}
              </Label>
              <ListingPhotosManager
                initialPhotos={initialListing ? photos : pendingPhotos}
                listingSlug={initialListing?.slug}
                onPhotosChange={handlePhotosChange}
                isNewListing={!initialListing}
              />
            </FieldsetWithGap>

            {listingType !== "residential" && (
              <MultiInput
                label={t("Listings.form.externalLinks")}
                addButtonText={t("Listings.form.addLink")}
                optionalText={t("Common.optional")}
                placeholder={t("Listings.form.linkPlaceholder")}
                items={links}
                handleItemChange={handleLinksChange}
                onClick={addLink}
                limit={3}
                type="url"
                pattern="https?://.+"
              />
            )}
          </FormSection>

          {initialListing && (
            <FormSection>
              <FormSectionHeader>
                <h2>{t("Listings.form.visibility")}</h2>
                <p>{t("Listings.form.visibilityHint")}</p>
              </FormSectionHeader>

              <Field>
                <Label htmlFor="visibility">
                  {t("Listings.form.mapVisibility")}
                </Label>
                <Select
                  id="visibility"
                  value={String(visibility)}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setVisibility(event.target.value === "true")
                  }
                  required={true}
                >
                  <option value="true">{t("Listings.form.showOnMap")}</option>
                  <option value="false">
                    {t("Listings.form.hideFromMap")}
                  </option>
                </Select>
              </Field>
            </FormSection>
          )}

          {profile?.is_admin && (
            <FormSection>
              <FormSectionHeader>
                <h2>{t("Common.admin")}</h2>
                <p>{t("Listings.form.adminHint")}</p>
              </FormSectionHeader>

              <Field>
                <Label htmlFor="stub">{t("Listings.form.stubSettings")}</Label>
                <Select
                  id="stub"
                  value={String(isStub)}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    setIsStub(event.target.value === "true")
                  }
                  required={true}
                >
                  <option value="false">
                    {t("Listings.form.regularListing")}
                  </option>
                  <option value="true">{t("Listings.form.stubListing")}</option>
                </Select>
                <InputHint>
                  {isStub
                    ? t("Listings.form.stubActiveHint")
                    : t("Listings.form.stubInactiveHint")}
                </InputHint>
              </Field>
            </FormSection>
          )}

          <FormSection>
            <CheckboxCluster>
              <LegalAgreement
                required={true}
                defaultChecked={initialListing ? true : undefined}
              />
            </CheckboxCluster>
          </FormSection>

          <SubmitButton
            data-testid="listing-write-submit"
            variant="primary"
            width="full"
            pending={submitMutation.isPending}
            pendingText={
              initialListing ? t("Status.saving") : t("Status.adding")
            }
            disabled={deleteMutation.isPending}
          >
            {initialListing
              ? t("Actions.saveChanges")
              : t("Actions.addListing")}
          </SubmitButton>
        </DisabledFieldset>
      </Form>

      {feedbackMessage && <FormMessage message={{ error: feedbackMessage }} />}

      {initialListing && (
        <AdditionalSettings>
          {hasUnsavedChanges ? (
            <ButtonToDialog
              variant="danger"
              triggerVariant="secondary"
              initialButtonText={t("Actions.viewListing")}
              dialogTitle={t("Listings.edit.discardChangesTitle")}
              confirmButtonText={t("Listings.edit.discardChangesConfirm")}
              cancelButtonText={t("Listings.edit.discardChangesCancel")}
              disabled={isMutating}
              onSubmit={handleDiscardChanges}
            >
              {t("Listings.edit.discardChangesBody")}
            </ButtonToDialog>
          ) : (
            <Button
              variant="secondary"
              width="contained"
              href={`/listings/${initialListing.slug}`}
              disabled={isMutating}
            >
              {t("Actions.viewListing")}
            </Button>
          )}

          <ButtonToDialog
            variant="danger"
            initialButtonText={t("Actions.deleteListing")}
            dialogTitle={t("Actions.deleteListing")}
            confirmButtonText={t("Listings.delete.confirm")}
            confirmLoadingText={t("Status.deleting")}
            disabled={submitMutation.isPending}
            onSubmit={handleDeleteListing}
            pending={deleteMutation.isPending}
          >
            {t("Listings.delete.dialog")}
          </ButtonToDialog>
        </AdditionalSettings>
      )}
    </>
  );
}
