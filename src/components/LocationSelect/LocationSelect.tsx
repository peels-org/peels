"use client";
import { theme } from "@/styles/theme.yak";
import { useCallback, useEffect, useState, useRef } from "react";
import type { ChangeEvent, Dispatch, SetStateAction } from "react";
import type { GeocodingFeature } from "@maptiler/client";

import { countries } from "@/data/countries";

import {
  Marker,
  type MapRef,
  type MarkerDragEvent,
} from "react-map-gl/maplibre";
// import "maplibre-gl/dist/maplibre-gl.css";

import Select from "@/components/Select";

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

const InputHintComponent = InputHint as any;

const StyledFieldset = styled(Fieldset)`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.forms.gap.field};
`;

const ZOOM_LEVEL = 16;

import { config, geocoding, geolocation } from "@maptiler/client";

// Reverse geocoding for legible location (area_name)
const mapTilerApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY ?? "";
config.apiKey = mapTilerApiKey;

// const maptilerClient = new maptilersdk.Maptiler();

type Coordinates = {
  latitude: number;
  longitude: number;
};

type AreaNameFeature = {
  id?: string;
  place_name?: string;
  place_type?: string[];
  properties?: {
    "osm:place_type"?: string;
  };
  text?: string;
  "osm:place_type"?: string;
};

type AreaNameMatch = {
  name: string;
  priority: number;
};

const areaNameTypePriority = [
  "neighbourhood",
  "place",
  "municipality",
  "region",
  "country",
  "continental_marine",
] as const;
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

function featureMatchesAreaType(feature: AreaNameFeature, type: string) {
  return (
    feature.place_type?.includes(type) ||
    feature.id?.startsWith(`${type}.`) ||
    feature.id?.startsWith(`${type}:`)
  );
}

function isUnknownOsmPlace(feature: AreaNameFeature) {
  return (
    feature.properties?.["osm:place_type"] === "unknown" ||
    feature["osm:place_type"] === "unknown"
  );
}

function getBestAreaNameMatchFromFeatures(
  features: AreaNameFeature[]
): AreaNameMatch | null {
  if (!features.length) {
    return null;
  }

  for (const [priority, type] of areaNameTypePriority.entries()) {
    const areaFeature = features.find(
      (feature) =>
        featureMatchesAreaType(feature, type) && !isUnknownOsmPlace(feature)
    );

    if (areaFeature?.text) {
      return {
        name: areaFeature.text,
        priority,
      };
    }
  }

  const fallbackName = features[0]?.place_name || features[0]?.text || "";

  return fallbackName
    ? {
        name: fallbackName,
        priority: areaNameTypePriority.length,
      }
    : null;
}

function getSelectedFeatureAreaNameMatch(feature: GeocodingFeature) {
  return getBestAreaNameMatchFromFeatures([
    feature,
    ...((feature.context as AreaNameFeature[] | undefined) ?? []),
  ]);
}

async function getAreaNameMatch(
  longitude: number,
  latitude: number
): Promise<AreaNameMatch | null> {
  try {
    if (!mapTilerApiKey) {
      return null;
    }

    const coordinates = await geocoding.reverse([longitude, latitude], {
      apiKey: mapTilerApiKey,
    });

    return getBestAreaNameMatchFromFeatures(
      coordinates.features as AreaNameFeature[]
    );
  } catch (error) {
    console.warn("Could not reverse-geocode selected location:", error);
    return null;
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

  const [mapShown, setMapShown] = useState(coordinates ? true : false);
  const placeholderText =
    initialPlaceholderText || t("Listings.form.locationPlaceholder");
  const [searchStatusMessage, setSearchStatusMessage] = useState("");

  useEffect(() => {
    if (autoDetectCountry && !normaliseListingCountryCode(countryCode)) {
      if (!mapTilerApiKey) {
        return;
      }

      let isMounted = true; // Track if component is mounted

      const initializeLocation = async () => {
        try {
          const response = await geolocation.info();
          const detectedCountryCode = normaliseListingCountryCode(
            response?.country_code
          );

          // Only update state if component is still mounted and user hasn't changed the value
          if (
            isMounted &&
            !normaliseListingCountryCode(countryCode) &&
            detectedCountryCode
          ) {
            setCountryCode(detectedCountryCode);
          }
        } catch (error) {
          console.warn("Could not detect country from IP:", error);
          // No fallback needed - keep initial selection
        }
      };

      initializeLocation();

      // Cleanup function
      return () => {
        isMounted = false;
      };
    }
  }, [autoDetectCountry, countryCode, setCountryCode]);

  const handleCountryChange = useCallback(
    (e: ChangeEvent<HTMLSelectElement>) => {
      onLocationInteract?.();
      setCountryCode(normaliseListingCountryCode(e.target.value) || "");
      setMapShown(false);
      inputRef.current?.focus();
    },
    [onLocationInteract, setCountryCode]
  );

  const handleDragStart = useCallback(() => {
    inputRef.current?.blur(); // Close and blur the input if it's open
  }, []);

  const handleDragEnd = useCallback(
    async (event: MarkerDragEvent) => {
      onLocationInteract?.();

      const nextCoordinates = {
        latitude: event.lngLat.lat,
        longitude: event.lngLat.lng,
      };

      setCoordinates(nextCoordinates); // Unsure if this is needed. Might be helpful for form submission

      const nextAreaNameMatch = await getAreaNameMatch(
        nextCoordinates.longitude,
        nextCoordinates.latitude
      );

      if (nextAreaNameMatch) {
        setAreaName(nextAreaNameMatch.name);
        inputRef.current?.setQuery(nextAreaNameMatch.name);
      } else {
        setAreaName("");
        inputRef.current?.setQuery("");
      }
    },
    [onLocationInteract, setCoordinates, setAreaName]
  );

  const handlePick = useCallback(
    async (feature: GeocodingFeature) => {
      if (!feature.center) return;

      onLocationInteract?.();

      const nextCoordinates = {
        latitude: feature.center[1],
        longitude: feature.center[0],
      };

      const selectedAreaNameMatch = getSelectedFeatureAreaNameMatch(feature);
      const reverseAreaNameMatch = selectedAreaNameMatch
        ? null
        : await getAreaNameMatch(
            nextCoordinates.longitude,
            nextCoordinates.latitude
          );
      const nextAreaNameMatch = selectedAreaNameMatch ?? reverseAreaNameMatch;
      const nextAreaName = nextAreaNameMatch?.name || feature.place_name;
      setAreaName(nextAreaName);
      inputRef.current?.setQuery(nextAreaName);

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
    [mapShown, onLocationInteract, setCoordinates, setAreaName]
  );

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

        {/* TODO: Handle database error when user doesn't enter a location */}
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
          onStatusMessageChange={setSearchStatusMessage}
          placeholder={placeholderText}
        />
        <InputHintComponent variant={error ? "error" : undefined}>
          {error
            ? error
            : searchStatusMessage ||
              t("Listings.form.locationHint", {
                type: listingType,
              })}
        </InputHintComponent>
      </Field>

      {mapShown && coordinates && (
        <Field>
          {/* <p>Refine your pin location:</p> */}

          <MapThumbnail
            ref={mapRef}
            initialViewState={{ ...coordinates, zoom: ZOOM_LEVEL }}
            height={`35dvh`}
            // Allow interaction but just disable the input handlers that collide with the overall form experience (i.e. scrolling)
            // dragRotate={false}
            // dragPan={false}
            scrollZoom={false}
            // doubleClickZoom={false}
            // boxZoom={false}
            // cursor="default"
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
