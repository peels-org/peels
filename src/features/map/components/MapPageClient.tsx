"use client";
import { theme } from "@/styles/theme.yak";

import { useCallback } from "react";
import { Drawer } from "vaul";
import { styled } from "next-yak";
import type { User } from "@supabase/supabase-js";

import { useDeviceContext } from "@/hooks/useDeviceContext";
import type { Listing, ListingMarker } from "@/types/listing";

import MapView from "./MapView";
import MapListingDrawerPanel from "./MapListingDrawerPanel";
import MapSidebar from "./MapSidebar";
import { useMapListingUrl } from "../hooks/useMapListingUrl";
import { useIpInitialLocation } from "../hooks/useIpInitialLocation";
import type { InitialMapCoordinates } from "../lib/mapInitialView";
import {
  MAP_DRAWER_SNAP_POINTS,
  useMapDrawerState,
} from "../hooks/useMapDrawerState";

type MapPageClientProps = {
  user: User | null;
  initialListingSlug?: string | null;
  initialListing?: Listing | null;
  initialMapCoordinates?: InitialMapCoordinates | null;
  referenceNow: string;
};

const StyledMapPage = styled.main`
  flex: 1;
  gap: ${theme.spacing.gap.desktop};
  align-items: stretch;
  display: flex;
  flex-direction: row;
`;

const StyledMapWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
  height: 100%;
  @media (min-width: 768px) {
    border-radius: ${theme.corners.base};
    border: 1px solid ${theme.colors.border.base};
    overflow: hidden;
  }
`;

export default function MapPageClient({
  user,
  initialListingSlug,
  initialListing,
  initialMapCoordinates,
  referenceNow,
}: MapPageClientProps) {
  const { isDesktop, hasTouch } = useDeviceContext();

  const {
    listingSlug,
    selectedListing,
    selectedListingId,
    isListingSelected,
    isSelectedListingLoading,
    selectListing,
    closeListing,
  } = useMapListingUrl({ user, initialListingSlug, initialListing });

  const { initialCoordinates } = useIpInitialLocation({
    initialCoordinates: initialMapCoordinates,
    skip: Boolean(initialListingSlug),
  });

  const {
    drawerContentRef,
    snap,
    setSnap,
    isFullSnap,
    isPartialSnap,
    isDrawerHeaderShown,
    resetDrawer,
    handleSnapChange,
  } = useMapDrawerState({ isDesktop, listingSlug, isListingSelected });

  const handleMarkerClick = useCallback(
    (listing: ListingMarker) => {
      if (listing.id === selectedListingId && isListingSelected) return;

      resetDrawer();
      selectListing(listing);
    },
    [isListingSelected, resetDrawer, selectListing, selectedListingId]
  );

  const handleMapClick = useCallback(() => {
    if (isListingSelected) {
      resetDrawer();
      closeListing();
    }
  }, [closeListing, isListingSelected, resetDrawer]);

  const handleDrawerOpenChange = useCallback(
    (open: boolean) => {
      // Drawer-driven close (e.g. escape key on desktop) should also update
      // the URL. We only act on the close transition — `open === true` is
      // already reflected by `isListingSelected` from the URL.
      if (!open && isListingSelected) {
        resetDrawer();
        closeListing();
      }
    },
    [closeListing, isListingSelected, resetDrawer]
  );

  const handlePanelClose = useCallback(() => {
    resetDrawer();
    closeListing();
  }, [closeListing, resetDrawer]);

  return (
    <StyledMapPage>
      <StyledMapWrapper>
        <Drawer.Root
          direction={isDesktop ? "right" : undefined}
          snapPoints={MAP_DRAWER_SNAP_POINTS}
          activeSnapPoint={isDesktop ? 1 : snap}
          setActiveSnapPoint={setSnap}
          modal={isDesktop ? false : isFullSnap}
          open={isListingSelected}
          onOpenChange={handleDrawerOpenChange}
        >
          <MapView
            selectedListing={selectedListing}
            selectedListingId={selectedListingId}
            listingSlug={listingSlug}
            isListingSelected={isListingSelected}
            initialCoordinates={initialCoordinates}
            onMapClick={handleMapClick}
            onMarkerClick={handleMarkerClick}
            isDesktop={isDesktop}
          />

          <MapListingDrawerPanel
            user={user}
            selectedListing={selectedListing}
            isSelectedListingLoading={isSelectedListingLoading}
            referenceNow={referenceNow}
            isDesktop={isDesktop}
            hasTouch={hasTouch}
            isDrawerHeaderShown={isDrawerHeaderShown}
            isFullSnap={isFullSnap}
            isPartialSnap={isPartialSnap}
            onToggleSnap={handleSnapChange}
            onClose={handlePanelClose}
            drawerContentRef={drawerContentRef}
          />
        </Drawer.Root>
      </StyledMapWrapper>
      {isDesktop && <MapSidebar user={user} covered={isListingSelected} />}
    </StyledMapPage>
  );
}
