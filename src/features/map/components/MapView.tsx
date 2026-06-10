"use client";
import { theme } from "@/styles/theme.yak";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";

import Map, {
  AttributionControl,
  Marker,
  type MapRef,
  type ViewStateChangeEvent,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";
import type { LngLatBounds } from "maplibre-gl";
import type { BBox, GeocodingFeature, Position } from "@maptiler/client";
import "maplibre-gl/dist/maplibre-gl.css";
import { useLocale, useTranslations } from "next-intl";
import { styled } from "next-yak";

import Button from "@/components/Button";
import type { ListingMarker, SelectedListing } from "@/types/listing";

import MapPinLayer from "./MapPinLayer";
import MapSearch, { type MapSearchContext } from "./MapSearch";
import MapControls from "./MapControls";
import {
  MAP_MAX_ZOOM,
  ZOOM_LEVEL_DEFAULT,
  ZOOM_LEVEL_SELECTED,
  getListingCoordinates,
  hasValidCoordinates,
  padBounds,
  wrapLongitude,
} from "../lib/mapUtils";
import { useListingsInView } from "../hooks/useListingsInView";
import { useMapCenter } from "../hooks/useMapCenter";
import { usePreferredMapFlavor } from "../hooks/usePreferredMapFlavor";
import { handleMapError } from "../lib/mapErrors";
import { createProtomapsStyle } from "../lib/protomapsStyle";
import {
  NEUTRAL_INITIAL_COORDINATES,
  saveStoredInitialMapCoordinates,
  type InitialMapCoordinates,
} from "../lib/mapInitialView";

type MapViewProps = {
  selectedListing: SelectedListing | null;
  selectedListingId: number | null;
  listingSlug: string | null;
  isListingSelected: boolean;
  initialCoordinates: InitialMapCoordinates | null;
  onMapClick: () => void;
  onMarkerClick: (listing: ListingMarker) => void;
  isDesktop: boolean;
};

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  background-color: ${theme.colors.background.map};
`;

const ReturnToListingButton = styled(Button)`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  @media (min-width: 768px) {
    top: auto;
    bottom: 20px;
  }
`;

const LoadingChip = styled.div`
  position: absolute;
  top: 0.75rem;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: ${theme.colors.background.top};
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.08);
  font-size: 0.75rem;
  font-weight: 500;
  color: ${theme.colors.text.secondary};
  opacity: 0.9;
  pointer-events: none;
  transition: opacity 150ms ease;
`;

const attributionControlMobileStyle: CSSProperties = {
  marginRight: "0.75rem",
  marginBottom: "5.25rem",
  opacity: 0.875,
};

const attributionControlDesktopStyle: CSSProperties = {
  opacity: 1,
  marginRight: "10px",
  marginBottom: "10px",
};

const STORE_MAP_VIEW_DELAY_MS = 300;
const STORE_MAP_VIEW_DELTA = 0.000001;
const STORE_MAP_ZOOM_DELTA = 0.01;
const PIN_DETAIL_MIN_ZOOM = 7.25;
const PIN_DETAIL_MAX_ZOOM = 8.25;
const PIN_ICON_MIN_ZOOM = 7.75;
const PIN_HALO_MIN_ZOOM = 8;
const PIN_HALO_MIN_SCALE = 0.18;
const PIN_HALO_FULL_ZOOM = MAP_MAX_ZOOM;
const PIN_HALO_GROWTH_EXPONENT = 2.2;
const MAP_ZOOM_DISABLED_EPSILON = 0.001;
const SEARCH_BOUNDS_PAD_FACTOR = 0.5;

type MapPinZoomStyle = CSSProperties & {
  "--map-pin-compact-scale": string;
  "--map-pin-detail-scale": string;
  "--map-pin-icon-opacity": string;
  "--map-pin-icon-scale": string;
  "--map-pin-halo-scale": string;
};

const UserLocationDot = styled.div`
  width: 0.875rem;
  height: 0.875rem;
  border-radius: 999px;
  background: ${theme.colors.focus.outline};
  border: 2px solid ${theme.colors.background.top};
  box-shadow: 0 0 0 4px
    color-mix(in srgb, ${theme.colors.focus.outline}, transparent 70%);
`;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getZoomProgress(zoom: number, minZoom: number, maxZoom: number) {
  return clamp((zoom - minZoom) / (maxZoom - minZoom), 0, 1);
}

function resolveMapPinZoomVariables(zoom: number): MapPinZoomStyle {
  const detailScale = getZoomProgress(
    zoom,
    PIN_DETAIL_MIN_ZOOM,
    PIN_DETAIL_MAX_ZOOM
  );
  const haloProgress = getZoomProgress(
    zoom,
    PIN_HALO_MIN_ZOOM,
    PIN_HALO_FULL_ZOOM
  );
  const easedHaloProgress = Math.pow(haloProgress, PIN_HALO_GROWTH_EXPONENT);
  const haloScale =
    PIN_HALO_MIN_SCALE + (1 - PIN_HALO_MIN_SCALE) * easedHaloProgress;
  const iconOpacity = zoom >= PIN_ICON_MIN_ZOOM ? 1 : 0;
  const iconScale = zoom >= PIN_ICON_MIN_ZOOM ? 0.5 + detailScale * 0.5 : 0;
  const compactScale = (10 + 14 * detailScale) / 24;

  return {
    "--map-pin-compact-scale": compactScale.toFixed(3),
    "--map-pin-detail-scale": detailScale.toFixed(3),
    "--map-pin-icon-opacity": iconOpacity.toFixed(3),
    "--map-pin-icon-scale": iconScale.toFixed(3),
    "--map-pin-halo-scale": haloScale.toFixed(3),
  };
}

function isMapZoomAtMax(zoom: number) {
  return zoom >= MAP_MAX_ZOOM - MAP_ZOOM_DISABLED_EPSILON;
}

function areNumberArraysEqual(
  first: readonly number[] | undefined,
  second: readonly number[] | undefined
) {
  if (!first || !second) return first === second;
  if (first.length !== second.length) return false;

  return first.every((value, index) => value === second[index]);
}

function areSearchContextsEqual(
  first: MapSearchContext | null,
  second: MapSearchContext | null
) {
  if (!first || !second) return first === second;

  return (
    areNumberArraysEqual(first.bbox, second.bbox) &&
    areNumberArraysEqual(first.proximity, second.proximity)
  );
}

function resolveMapSearchContext(bounds: LngLatBounds): MapSearchContext {
  const center = bounds.getCenter();
  const paddedBoxes = padBounds(bounds, SEARCH_BOUNDS_PAD_FACTOR);
  const bbox: BBox | undefined =
    paddedBoxes.length === 1
      ? [
          paddedBoxes[0].west,
          paddedBoxes[0].south,
          paddedBoxes[0].east,
          paddedBoxes[0].north,
        ]
      : undefined;
  const proximity: Position = [wrapLongitude(center.lng), center.lat];

  return { bbox, proximity };
}

function resolveInitialViewState(
  selectedListing: SelectedListing | null,
  initialCoordinates: InitialMapCoordinates | null
) {
  const selectedCoords = getListingCoordinates(selectedListing);
  const isSelected =
    hasValidCoordinates(selectedListing) && selectedCoords !== null;

  return {
    longitude:
      (isSelected ? selectedCoords!.longitude : undefined) ??
      initialCoordinates?.longitude ??
      NEUTRAL_INITIAL_COORDINATES.longitude,
    latitude:
      (isSelected ? selectedCoords!.latitude : undefined) ??
      initialCoordinates?.latitude ??
      NEUTRAL_INITIAL_COORDINATES.latitude,
    zoom: isSelected
      ? ZOOM_LEVEL_SELECTED
      : (initialCoordinates?.zoom ?? NEUTRAL_INITIAL_COORDINATES.zoom),
  };
}

export default function MapView({
  selectedListing,
  selectedListingId,
  listingSlug,
  isListingSelected,
  initialCoordinates,
  onMapClick,
  onMarkerClick,
  isDesktop,
}: MapViewProps) {
  const t = useTranslations("Map");
  const locale = useLocale();
  const mapFlavor = usePreferredMapFlavor();
  const mapRef = useRef<MapRef | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchContext, setSearchContext] = useState<MapSearchContext | null>(
    null
  );
  const [userCoordinates, setUserCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const mapPinZoomStyleRef = useRef<MapPinZoomStyle | null>(null);
  const initialMapPinZoomStyleRef = useRef<MapPinZoomStyle | null>(null);
  const pendingPinZoomRef = useRef<number | null>(null);
  const pinZoomAnimationFrameRef = useRef<number | null>(null);
  const hasSyncedIdleBoundsRef = useRef(false);
  const saveMapViewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastSavedMapViewRef = useRef<InitialMapCoordinates | null>(
    initialCoordinates
  );
  const mapStyle = useMemo(
    () => createProtomapsStyle({ flavorName: mapFlavor, locale }),
    [locale, mapFlavor]
  );
  const initialViewState = useMemo(
    () => resolveInitialViewState(selectedListing, initialCoordinates),
    [initialCoordinates, selectedListing]
  );
  const [isZoomInDisabled, setIsZoomInDisabled] = useState(() =>
    isMapZoomAtMax(initialViewState.zoom)
  );
  const hasInitialPosition =
    hasValidCoordinates(selectedListing) || initialCoordinates !== null;

  if (hasInitialPosition && initialMapPinZoomStyleRef.current === null) {
    initialMapPinZoomStyleRef.current = resolveMapPinZoomVariables(
      initialViewState.zoom
    );
  }

  const { listings, isFetching, requestBounds } = useListingsInView();

  const {
    isSelectedInView,
    handleMapLoad,
    handleMapMoveEnd,
    flyToSelected,
    flyToCoordinate,
  } = useMapCenter({
    mapRef,
    selectedListing,
  });

  const emitBoundsChange = useCallback(
    (bounds: LngLatBounds) => {
      requestBounds(bounds);
    },
    [requestBounds]
  );

  const syncSearchContext = useCallback((bounds: LngLatBounds) => {
    const nextSearchContext = resolveMapSearchContext(bounds);

    setSearchContext((currentSearchContext) =>
      areSearchContextsEqual(currentSearchContext, nextSearchContext)
        ? currentSearchContext
        : nextSearchContext
    );
  }, []);

  const syncZoomControlState = useCallback((zoom: number) => {
    const nextIsZoomInDisabled = isMapZoomAtMax(zoom);

    setIsZoomInDisabled((currentIsZoomInDisabled) =>
      currentIsZoomInDisabled === nextIsZoomInDisabled
        ? currentIsZoomInDisabled
        : nextIsZoomInDisabled
    );
  }, []);

  const applyMapPinZoomVariables = useCallback((zoom: number) => {
    const container = mapContainerRef.current;
    if (!container) return;

    const variables = resolveMapPinZoomVariables(zoom);
    const previousVariables = mapPinZoomStyleRef.current;
    if (
      previousVariables &&
      previousVariables["--map-pin-compact-scale"] ===
        variables["--map-pin-compact-scale"] &&
      previousVariables["--map-pin-detail-scale"] ===
        variables["--map-pin-detail-scale"] &&
      previousVariables["--map-pin-icon-opacity"] ===
        variables["--map-pin-icon-opacity"] &&
      previousVariables["--map-pin-icon-scale"] ===
        variables["--map-pin-icon-scale"] &&
      previousVariables["--map-pin-halo-scale"] ===
        variables["--map-pin-halo-scale"]
    ) {
      return;
    }

    mapPinZoomStyleRef.current = variables;
    container.style.setProperty(
      "--map-pin-compact-scale",
      variables["--map-pin-compact-scale"]
    );
    container.style.setProperty(
      "--map-pin-detail-scale",
      variables["--map-pin-detail-scale"]
    );
    container.style.setProperty(
      "--map-pin-icon-opacity",
      variables["--map-pin-icon-opacity"]
    );
    container.style.setProperty(
      "--map-pin-icon-scale",
      variables["--map-pin-icon-scale"]
    );
    container.style.setProperty(
      "--map-pin-halo-scale",
      variables["--map-pin-halo-scale"]
    );
  }, []);

  const scheduleMapPinZoomUpdate = useCallback(
    (zoom: number) => {
      pendingPinZoomRef.current = zoom;

      if (pinZoomAnimationFrameRef.current !== null) return;

      pinZoomAnimationFrameRef.current = window.requestAnimationFrame(() => {
        pinZoomAnimationFrameRef.current = null;

        if (pendingPinZoomRef.current === null) return;
        applyMapPinZoomVariables(pendingPinZoomRef.current);
      });
    },
    [applyMapPinZoomVariables]
  );

  const syncCurrentMapState = useCallback(() => {
    const map = mapRef.current?.getMap();
    if (!map) return null;

    applyMapPinZoomVariables(map.getZoom());
    syncZoomControlState(map.getZoom());
    const bounds = map.getBounds();
    emitBoundsChange(bounds);
    syncSearchContext(bounds);

    return map;
  }, [
    applyMapPinZoomVariables,
    emitBoundsChange,
    syncSearchContext,
    syncZoomControlState,
  ]);

  const handleLoad = useCallback(() => {
    handleMapLoad();
    hasSyncedIdleBoundsRef.current = false;
    syncCurrentMapState();
  }, [handleMapLoad, syncCurrentMapState]);

  const handleIdle = useCallback(() => {
    if (hasSyncedIdleBoundsRef.current) return;

    hasSyncedIdleBoundsRef.current = true;
    syncCurrentMapState();
  }, [syncCurrentMapState]);

  useEffect(() => {
    if (initialCoordinates) {
      lastSavedMapViewRef.current = initialCoordinates;
    }
  }, [initialCoordinates]);

  const scheduleStoredMapViewSave = useCallback(() => {
    if (saveMapViewTimeoutRef.current !== null) {
      clearTimeout(saveMapViewTimeoutRef.current);
    }

    saveMapViewTimeoutRef.current = setTimeout(() => {
      saveMapViewTimeoutRef.current = null;

      const map = mapRef.current?.getMap();
      if (!map) return;

      const center = map.getCenter();
      const coordinates = {
        latitude: center.lat,
        longitude: wrapLongitude(center.lng),
        zoom: map.getZoom(),
      };
      const lastSaved = lastSavedMapViewRef.current;
      const hasMeaningfulChange =
        !lastSaved ||
        Math.abs(lastSaved.latitude - coordinates.latitude) >
          STORE_MAP_VIEW_DELTA ||
        Math.abs(lastSaved.longitude - coordinates.longitude) >
          STORE_MAP_VIEW_DELTA ||
        Math.abs(lastSaved.zoom - coordinates.zoom) > STORE_MAP_ZOOM_DELTA;

      if (!hasMeaningfulChange) return;

      saveStoredInitialMapCoordinates(coordinates);
      lastSavedMapViewRef.current = coordinates;
    }, STORE_MAP_VIEW_DELAY_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (saveMapViewTimeoutRef.current !== null) {
        clearTimeout(saveMapViewTimeoutRef.current);
      }

      if (pinZoomAnimationFrameRef.current !== null) {
        window.cancelAnimationFrame(pinZoomAnimationFrameRef.current);
      }
    };
  }, []);

  const handleMove = useCallback(
    (event: ViewStateChangeEvent) => {
      scheduleMapPinZoomUpdate(event.viewState.zoom);
      syncZoomControlState(event.viewState.zoom);
    },
    [scheduleMapPinZoomUpdate, syncZoomControlState]
  );

  const handleMoveEnd = useCallback(
    (_event: ViewStateChangeEvent) => {
      const map = mapRef.current?.getMap();
      if (!map) return;

      scheduleStoredMapViewSave();
      const bounds = map.getBounds();
      emitBoundsChange(bounds);
      syncSearchContext(bounds);
      handleMapMoveEnd();
    },
    [
      emitBoundsChange,
      handleMapMoveEnd,
      scheduleStoredMapViewSave,
      syncSearchContext,
    ]
  );

  const handleMapClickInternal = useCallback(
    (_event: MapLayerMouseEvent) => {
      if (selectedListingId !== null || isListingSelected || listingSlug) {
        onMapClick();
      }
    },
    [isListingSelected, listingSlug, onMapClick, selectedListingId]
  );

  const zoomIn = useCallback(() => {
    mapRef.current?.getMap().zoomIn();
  }, []);

  const zoomOut = useCallback(() => {
    mapRef.current?.getMap().zoomOut();
  }, []);

  const handleLocate = useCallback(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coordinates = {
          latitude: coords.latitude,
          longitude: coords.longitude,
        };
        setUserCoordinates(coordinates);
        flyToCoordinate(coordinates, ZOOM_LEVEL_DEFAULT);
      },
      (error) => {
        console.warn("Could not locate current position:", error);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60_000,
        timeout: 10_000,
      }
    );
  }, [flyToCoordinate]);

  const handleSearchPick = useCallback(
    (feature: GeocodingFeature) => {
      const center = feature.center;
      if (!center) return;

      flyToCoordinate(
        { longitude: center[0], latitude: center[1] },
        ZOOM_LEVEL_DEFAULT
      );
    },
    [flyToCoordinate]
  );

  const showReturnButton = Boolean(
    selectedListing && isListingSelected && !isSelectedInView
  );

  return (
    <MapContainer
      ref={mapContainerRef}
      role="region"
      aria-label={t("mapRegionLabel")}
      data-testid="map-view"
      style={initialMapPinZoomStyleRef.current ?? undefined}
    >
      {hasInitialPosition ? (
        <>
          <Map
            ref={mapRef}
            attributionControl={false}
            mapStyle={mapStyle}
            maxZoom={MAP_MAX_ZOOM}
            renderWorldCopies={true}
            initialViewState={initialViewState}
            onMove={handleMove}
            onZoom={handleMove}
            onMoveEnd={handleMoveEnd}
            onLoad={handleLoad}
            onIdle={handleIdle}
            onError={handleMapError}
            onClick={handleMapClickInternal}
          >
            <AttributionControl
              compact={true}
              style={
                !isDesktop
                  ? attributionControlMobileStyle
                  : attributionControlDesktopStyle
              }
            />

            <MapPinLayer
              listings={listings}
              markerLabel={t("markerLabel")}
              selectedListingId={selectedListingId}
              onMarkerClick={onMarkerClick}
            />
            {userCoordinates ? (
              <Marker
                longitude={userCoordinates.longitude}
                latitude={userCoordinates.latitude}
                anchor="center"
              >
                <UserLocationDot aria-hidden="true" />
              </Marker>
            ) : null}
          </Map>

          <MapControls
            controlsLabel={t("controlsLabel")}
            locateActive={Boolean(userCoordinates)}
            locateLabel={t("locateControl")}
            onLocate={handleLocate}
            onSearch={() => setIsSearchOpen(true)}
            onZoomIn={zoomIn}
            onZoomOut={zoomOut}
            searchLabel={t("searchLabel")}
            zoomInDisabled={isZoomInDisabled}
            zoomInLabel={t("zoomInControl")}
            zoomControlsLabel={t("zoomControlsLabel")}
            zoomOutLabel={t("zoomOutControl")}
          />
          <MapSearch
            onPick={handleSearchPick}
            searchContext={searchContext}
            open={isSearchOpen}
            onOpenChange={setIsSearchOpen}
          />
        </>
      ) : (
        <LoadingChip role="status" aria-live="polite">
          {t("loadingPins")}
        </LoadingChip>
      )}

      {hasInitialPosition && isFetching && (
        <LoadingChip role="status" aria-live="polite">
          {t("loadingPins")}
        </LoadingChip>
      )}

      {showReturnButton && (
        <ReturnToListingButton
          onClick={flyToSelected}
          variant="secondary"
          size="small"
          width="contained"
        >
          {t("returnToListing")}
        </ReturnToListingButton>
      )}
    </MapContainer>
  );
}
