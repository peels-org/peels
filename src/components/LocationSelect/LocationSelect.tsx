"use client";
import { theme } from "@/styles/theme.yak";
import { useCallback, useEffect, useId, useState, useRef } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { GeocodingFeature } from "@maptiler/client";

import { countries } from "@/data/countries";

import {
  Marker,
  type MapRef,
  type MarkerDragEvent,
} from "react-map-gl/maplibre";

import Select from "@/components/Select";
import {
  Radio as HeadlessRadio,
  RadioGroup as HeadlessRadioGroup,
} from "@headlessui/react";
import { CheckCircleIcon } from "@heroicons/react/24/solid";

import MapThumbnail from "@/components/MapThumbnail";
import MapPin from "@/components/MapPin";
import GeocodingSearch, {
  type GeocodingSearchHandle,
} from "@/features/map/components/GeocodingSearch";
import { MapZoomControls } from "@/features/map/components/MapControls";

import Fieldset from "@/components/Fieldset";
import Field from "@/components/Field";
import Label from "@/components/Label";
import InputHint from "@/components/InputHint";

import { styled } from "next-yak";
import { useTranslations } from "next-intl";
import {
  LISTING_COUNTRY_PLACEHOLDER,
  normaliseListingCountryCode,
} from "@/utils/listingCountry";
import {
  collectPublicAreaNameOptions,
  collectPublicAreaNameOptionsFromSelectedFeature,
  derivePublicAreaName,
  getSelectedFeatureDisplayName,
  isInstitutionalPlaceLabel,
  type ListingAreaNameFeature,
  type PublicAreaNameOption,
} from "@/utils/listingAreaName";

const InputHintComponent = InputHint as any;

const StyledFieldset = styled(Fieldset)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.forms.gap.field};
`;

const ChangeButton = styled.button`
  appearance: none;
  border: 0;
  background: transparent;
  padding: 0;
  margin: 0;
  color: ${theme.colors.text.brand.primary};
  font: inherit;
  font-weight: 500;
  text-decoration: underline;
  text-underline-offset: 0.14em;
  cursor: pointer;
  transition: opacity 150ms ease-in-out;

  &:hover {
    opacity: 0.65;
  }

  &:focus-visible {
    outline: 2px solid ${theme.colors.focus.outline};
    outline-offset: 2px;
  }
`;

const AreaNamePicker = styled.div`
  margin-top: 0.35rem;
`;

const AreaNameRadioGroup = styled(HeadlessRadioGroup)`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

const AreaNameRadio = styled(HeadlessRadio)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin: 0;
  padding: 0.55rem 0.75rem;
  border: 1px solid ${theme.colors.border.stark};
  border-radius: calc(${theme.corners.base} * 0.5);
  background-color: ${theme.colors.background.slight};
  cursor: pointer;
  font-size: 0.9375rem;
  line-height: 1.3;
  font-weight: 500;
  color: ${theme.colors.text.ui.primary};
  transition:
    background-color 150ms ease-in-out,
    border-color 150ms ease-in-out;

  &[data-checked] {
    border-color: ${theme.colors.border.focus};
    outline: 2px solid ${theme.colors.focus.outline};
    outline-offset: 0;

    & .area-name-check-icon {
      opacity: 1;
    }
  }

  &[data-hover]:not([data-checked]) {
    border-color: ${theme.colors.border.focus};
  }

  &[data-focus] {
    outline: 2px solid ${theme.colors.focus.outline};
    outline-offset: 0;
  }
`;

const AreaNameCheckIcon = styled(CheckCircleIcon)`
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  opacity: 0;
  fill: ${theme.colors.text.primary};
  transition: opacity 150ms ease-in-out;
`;

const ZOOM_LEVEL = 16;

import { config, geocoding, geolocation } from "@maptiler/client";

const mapTilerApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";
config.apiKey = mapTilerApiKey;

type Coordinates = {
  latitude: number;
  longitude: number;
};

type LocationSelectProps = {
  listingType: string;
  coordinates: Coordinates | null;
  setCoordinates: Dispatch<SetStateAction<Coordinates | null>>;
  countryCode: string;
  setCountryCode: Dispatch<SetStateAction<string>>;
  areaName: string;
  setAreaName: Dispatch<SetStateAction<string>>;
  initialPlaceholderText?: string;
  autoDetectCountry?: boolean;
  onLocationInteract?: () => void;
  error?: string;
};

function isUsableReverseDisplayName(name: string) {
  const trimmed = name.trim();
  if (!trimmed || trimmed === "-") {
    return false;
  }

  // MapTiler sometimes returns sparse address lines like "-, Sydney, …".
  if (/^-/.test(trimmed) || /,\s*-/.test(trimmed)) {
    return false;
  }

  return true;
}

function reverseGeocodeDisplayName(features: ListingAreaNameFeature[]) {
  for (const feature of features) {
    const placeName = feature.place_name?.trim();
    if (placeName && isUsableReverseDisplayName(placeName)) {
      return placeName;
    }
  }

  for (const feature of features) {
    const text = feature.text?.trim();
    if (text && isUsableReverseDisplayName(text)) {
      return text;
    }
  }

  return "";
}

async function reverseGeocodeFeatures(
  longitude: number,
  latitude: number
): Promise<ListingAreaNameFeature[]> {
  try {
    if (!mapTilerApiKey) {
      return [];
    }

    // Multi-type reverse returns at most one feature per type. A second
    // place-only query (limit > 1) picks up both a city and a nearby campus.
    // Use allSettled so a single failed request still yields the other.
    const [broadResult, nearbyPlacesResult] = await Promise.allSettled([
      geocoding.reverse([longitude, latitude], {
        apiKey: mapTilerApiKey,
        types: [
          "neighbourhood",
          "locality",
          "municipal_district",
          "municipality",
          "address",
          "road",
          "poi",
        ],
      }),
      geocoding.reverse([longitude, latitude], {
        apiKey: mapTilerApiKey,
        types: ["place"],
        limit: 5,
      }),
    ]);

    const features: ListingAreaNameFeature[] = [];

    if (broadResult.status === "fulfilled") {
      features.push(
        ...(broadResult.value.features as ListingAreaNameFeature[])
      );
    } else {
      console.warn(
        "Could not reverse-geocode broad area features:",
        broadResult.reason
      );
    }

    if (nearbyPlacesResult.status === "fulfilled") {
      features.push(
        ...(nearbyPlacesResult.value.features as ListingAreaNameFeature[])
      );
    } else {
      console.warn(
        "Could not reverse-geocode nearby places:",
        nearbyPlacesResult.reason
      );
    }

    return features;
  } catch (error) {
    console.warn("Could not reverse-geocode selected location:", error);
    return [];
  }
}

export default function LocationSelect({
  listingType,
  coordinates,
  setCoordinates,
  countryCode,
  setCountryCode,
  areaName,
  setAreaName,
  initialPlaceholderText,
  autoDetectCountry = true,
  onLocationInteract,
  error,
}: LocationSelectProps) {
  const t = useTranslations();
  const mapRef = useRef<MapRef | null>(null);
  const inputRef = useRef<GeocodingSearchHandle | null>(null);
  const reverseGeocodeRequestIdRef = useRef(0);
  const areaNamePickerId = useId();
  // Only set when the user picks from the dropdown — never when IP applies.
  const userChoseCountryRef = useRef(false);
  const [detectedCountryCode, setDetectedCountryCode] = useState<string | null>(
    null
  );

  const [mapShown, setMapShown] = useState(coordinates ? true : false);
  const placeholderText =
    initialPlaceholderText || t("Listings.form.locationPlaceholder");
  const [searchStatusMessage, setSearchStatusMessage] = useState("");
  const [areaNameOptions, setAreaNameOptions] = useState<
    PublicAreaNameOption[]
  >([]);
  const [isAreaNamePickerOpen, setIsAreaNamePickerOpen] = useState(false);

  // 1) Detect country from IP once (for new listings).
  useEffect(() => {
    if (!autoDetectCountry) {
      return;
    }

    if (!mapTilerApiKey) {
      return;
    }

    let cancelled = false;

    const initializeLocation = async () => {
      try {
        const response = await geolocation.info();
        const detected = normaliseListingCountryCode(response?.country_code);

        if (!cancelled && detected) {
          setDetectedCountryCode(detected);
        }
      } catch (detectError) {
        console.warn("Could not detect country from IP:", detectError);
      }
    };

    initializeLocation();

    return () => {
      cancelled = true;
    };
  }, [autoDetectCountry]);

  // 2) Apply detection only while the field is still empty and the user
  //    hasn't chosen manually (avoids late IP responses clobbering a pick).
  useEffect(() => {
    if (!detectedCountryCode) {
      return;
    }

    setCountryCode((current) => {
      if (userChoseCountryRef.current) {
        return current;
      }

      if (normaliseListingCountryCode(current)) {
        return current;
      }

      return detectedCountryCode;
    });
  }, [detectedCountryCode, setCountryCode]);

  const applyAreaNameOptions = useCallback(
    (nextOptions: PublicAreaNameOption[], preferredName?: string) => {
      setAreaNameOptions(nextOptions);

      if (!nextOptions.length) {
        setAreaName("");
        setIsAreaNamePickerOpen(false);
        return;
      }

      const preferredStillValid =
        preferredName &&
        nextOptions.some((option) => option.name === preferredName);

      const defaultName =
        nextOptions.find((option) => !isInstitutionalPlaceLabel(option.name))
          ?.name ?? nextOptions[0].name;

      setAreaName(preferredStillValid ? preferredName : defaultName);
    },
    [setAreaName]
  );

  const handleCountryChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      const nextCountryCode = normaliseListingCountryCode(e.target.value);

      // Ignore spurious events that clear back to the placeholder.
      if (!nextCountryCode) {
        return;
      }

      userChoseCountryRef.current = true;
      onLocationInteract?.();
      setCountryCode(nextCountryCode);
      setMapShown(false);
      inputRef.current?.focus();
    },
    [onLocationInteract, setCountryCode]
  );

  const handleDragStart = useCallback(() => {
    inputRef.current?.blur();
  }, []);

  const handleDragEnd = useCallback(
    async (event: MarkerDragEvent) => {
      onLocationInteract?.();

      const nextCoordinates = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };

      setCoordinates(nextCoordinates);

      const requestId = reverseGeocodeRequestIdRef.current + 1;
      reverseGeocodeRequestIdRef.current = requestId;

      const reverseFeatures = await reverseGeocodeFeatures(
        nextCoordinates.longitude,
        nextCoordinates.latitude
      );

      if (reverseGeocodeRequestIdRef.current !== requestId) {
        return;
      }

      const nextOptions = collectPublicAreaNameOptions(reverseFeatures);
      const nextAreaNameMatch = derivePublicAreaName(reverseFeatures);
      const displayName =
        reverseGeocodeDisplayName(reverseFeatures) ||
        nextAreaNameMatch?.name ||
        "";

      applyAreaNameOptions(nextOptions, areaName);
      inputRef.current?.setQuery(displayName);
    },
    [onLocationInteract, setCoordinates, applyAreaNameOptions, areaName]
  );

  const handleClearSearch = useCallback(() => {
    reverseGeocodeRequestIdRef.current += 1;
    onLocationInteract?.();
    setCoordinates(null);
    setAreaName("");
    setAreaNameOptions([]);
    setIsAreaNamePickerOpen(false);
    setMapShown(false);
  }, [onLocationInteract, setCoordinates, setAreaName]);

  const handlePick = useCallback(
    async (feature: GeocodingFeature) => {
      if (!feature.center) return;

      onLocationInteract?.();

      const nextCoordinates = {
        latitude: feature.center[1],
        longitude: feature.center[0],
      };

      const displayName = getSelectedFeatureDisplayName(feature);
      const requestId = reverseGeocodeRequestIdRef.current + 1;
      reverseGeocodeRequestIdRef.current = requestId;

      const reverseFeatures = await reverseGeocodeFeatures(
        nextCoordinates.longitude,
        nextCoordinates.latitude
      );

      if (reverseGeocodeRequestIdRef.current !== requestId) {
        return;
      }

      const nextOptions = collectPublicAreaNameOptionsFromSelectedFeature(
        feature,
        reverseFeatures
      );

      applyAreaNameOptions(nextOptions);
      setIsAreaNamePickerOpen(false);
      inputRef.current?.setQuery(displayName);
      inputRef.current?.blur();

      if (!mapShown) {
        setCoordinates(nextCoordinates);
        setMapShown(true);
      } else {
        mapRef.current?.flyTo({
          center: [nextCoordinates.longitude, nextCoordinates.latitude],
          duration: 2800,
          zoom: ZOOM_LEVEL,
        });
        setCoordinates(nextCoordinates);
      }
    },
    [mapShown, onLocationInteract, setCoordinates, applyAreaNameOptions]
  );

  const canChangeAreaName = areaNameOptions.length > 1;

  return (
    <StyledFieldset>
      <Field>
        <Label htmlFor="country">{t("Listings.form.location")}</Label>
        {/* TODO: Accessibility: label currently covers both select and geocoding control but not yet via htmlFor. Fix or make a separate visually hidden one for the geocoding control */}
        <Select
          id="country"
          value={
            normaliseListingCountryCode(countryCode) ||
            LISTING_COUNTRY_PLACEHOLDER
          }
          onChange={handleCountryChange}
        >
          <option disabled={true} value={LISTING_COUNTRY_PLACEHOLDER}>
            {t("Listings.form.selectCountry")}
          </option>
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.name}
            </option>
          ))}
        </Select>

        <GeocodingSearch
          ref={inputRef}
          id="autocomplete"
          ariaInvalid={error ? "true" : undefined}
          ariaLabel={t("Listings.form.location")}
          clearLabel={t("Map.searchClear")}
          countryCode={normaliseListingCountryCode(countryCode)}
          error={error}
          errorMessage={t("Map.searchError")}
          inputTestId="listing-location-search-input"
          loadingMessage={t("Map.searchLoading")}
          noResultsMessage={t("Map.searchNoResults")}
          onPick={handlePick}
          onClear={handleClearSearch}
          onStatusMessageChange={setSearchStatusMessage}
          placeholder={placeholderText}
        />
        <InputHintComponent
          variant={error ? "error" : undefined}
          data-testid={areaName ? "listing-public-area-label" : undefined}
        >
          {error
            ? error
            : searchStatusMessage
              ? searchStatusMessage
              : areaName
                ? canChangeAreaName
                  ? t.rich("Listings.form.shownOnPeelsAsChange", {
                      area: areaName,
                      change: (chunks) => (
                        <ChangeButton
                          type="button"
                          data-testid="listing-area-name-change"
                          aria-expanded={isAreaNamePickerOpen}
                          aria-controls={areaNamePickerId}
                          onClick={() => {
                            onLocationInteract?.();
                            setIsAreaNamePickerOpen((open) => !open);
                          }}
                        >
                          {chunks}
                        </ChangeButton>
                      ),
                    })
                  : t("Listings.form.shownOnPeelsAs", {
                      area: areaName,
                    })
                : t("Listings.form.locationHint", {
                    type: listingType,
                  })}
        </InputHintComponent>

        {isAreaNamePickerOpen && canChangeAreaName ? (
          <AreaNamePicker id={areaNamePickerId}>
            <AreaNameRadioGroup
              value={areaName}
              onChange={(value) => {
                if (typeof value !== "string") return;
                onLocationInteract?.();
                setAreaName(value);
              }}
              aria-label={t("Listings.form.areaNamePickerLabel")}
              data-testid="listing-area-name-options"
            >
              {areaNameOptions.map((option) => (
                <AreaNameRadio key={option.name} value={option.name}>
                  <span>{option.name}</span>
                  <AreaNameCheckIcon
                    className="area-name-check-icon"
                    aria-hidden="true"
                  />
                </AreaNameRadio>
              ))}
            </AreaNameRadioGroup>
          </AreaNamePicker>
        ) : null}
      </Field>

      {mapShown && coordinates && (
        <Field>
          <MapThumbnail
            ref={mapRef}
            initialViewState={{ ...coordinates, zoom: ZOOM_LEVEL }}
            height={`35dvh`}
            scrollZoom={false}
          >
            <Marker
              draggable={true}
              longitude={coordinates.longitude}
              latitude={coordinates.latitude}
              anchor="center"
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <MapPin type={listingType} selected={true} />
            </Marker>
            <MapZoomControls
              controlsLabel={t("Map.zoomControlsLabel")}
              onZoomIn={() => mapRef.current?.getMap().zoomIn()}
              onZoomOut={() => mapRef.current?.getMap().zoomOut()}
              zoomInLabel={t("Map.zoomInControl")}
              zoomOutLabel={t("Map.zoomOutControl")}
            />
          </MapThumbnail>

          <InputHintComponent>
            {t("Listings.form.dragPinHint", {
              obscure: listingType === "residential" ? "true" : "false",
            })}
          </InputHintComponent>
        </Field>
      )}
    </StyledFieldset>
  );
}
