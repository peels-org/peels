"use client";
import { Fragment, useState, memo, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";

import { Marker } from "react-map-gl/maplibre";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import {
  getAnonymousSensitiveListingTeaser,
  getListingDisplayName,
} from "@/utils/listingUtils";
import { parseInlineText } from "@/utils/linkUtils";
import ListingHeader from "@/components/ListingHeader";
import ListingItemList from "@/components/ListingItemList";
import ListingPhotoGallery from "@/components/ListingPhotoGallery";
import MapThumbnail from "@/components/MapThumbnail";
import MapPin from "@/components/MapPin";
import Button from "@/components/Button";
import ListingChatDrawer from "@/components/ListingChatDrawer";
import StrongLink from "@/components/StrongLink";
import { css, styled } from "next-yak";
import { theme } from "@/styles/theme.yak";
import { useTranslations } from "next-intl";

import type { DemoListing, Listing } from "@/types/listing";
import type { ChatThreadRecord } from "@/types/chat";

type Presentation = "full" | "drawer" | "demo";

type ListingReadListing = Listing | DemoListing;

type SharedListingReadProps = {
  user: User | null;
  listing: ListingReadListing | null;
  listingDisplayName?: string;
};

type DemoListingReadProps = SharedListingReadProps & {
  presentation: "demo";
  referenceNow?: never;
};

type NonDemoListingReadProps = SharedListingReadProps & {
  presentation?: Exclude<Presentation, "demo">;
  referenceNow: string;
};

type ListingReadProps = DemoListingReadProps | NonDemoListingReadProps;

function isDemoListing(
  listing: ListingReadListing | null
): listing is DemoListing {
  return Boolean(listing && (listing as DemoListing).is_demo === true);
}

function requireReferenceNow(referenceNow: string | undefined) {
  if (!referenceNow) {
    throw new Error(
      "ListingRead requires referenceNow for non-demo presentations"
    );
  }

  return referenceNow;
}

const ListingRead = memo(function Listing({
  user,
  listing,
  listingDisplayName: providedListingDisplayName,
  presentation = "full",
  referenceNow,
}: ListingReadProps) {
  const t = useTranslations();
  // Hooks must be called unconditionally; router is unused in demo mode.
  const router = useRouter();

  const [existingThread, setExistingThread] = useState<ChatThreadRecord | null>(
    null
  );
  const [isAdmin, setIsAdmin] = useState(false);
  // Chat drawer state is owned here so that each selected listing gets a
  // fresh drawer. The parent resets this by remounting with `key`.
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // `createClient()` builds a new Supabase browser client on every call, so
  // memoize to keep the reference stable — otherwise the thread-loading
  // effect below (which depends on `supabase`) would re-run on every render.
  const supabase = useMemo(
    () => (presentation !== "demo" ? createClient() : null),
    [presentation]
  );

  const isDemo = presentation === "demo";
  const nonDemoReferenceNow = !isDemo ? referenceNow : undefined;
  const demoListing = isDemoListing(listing) ? listing : null;
  const rawRealListing =
    !isDemo && listing && !isDemoListing(listing) ? (listing as Listing) : null;
  const realListing = useMemo(
    () =>
      rawRealListing
        ? getAnonymousSensitiveListingTeaser(rawRealListing, user)
        : null,
    [rawRealListing, user]
  );
  const listingForDisplay = demoListing ?? realListing;

  // Load existing thread if any (only if not in demo mode). Depend on the
  // specific listing fields used inside the effect so a new `realListing`
  // object identity with the same id/owner doesn't refire the query.
  const listingId = realListing?.id;
  const listingOwnerId = realListing?.owner_id;
  const userId = user?.id;
  useEffect(() => {
    if (isDemo || !supabase || !userId) {
      setIsAdmin(false);
      return;
    }

    let isCurrentRequest = true;

    async function loadAdminFlag() {
      if (!supabase) return;
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", userId)
        .maybeSingle<{ is_admin: boolean | null }>();

      if (error) {
        console.error("Error loading admin flag:", error);
        return;
      }

      if (!isCurrentRequest) return;
      setIsAdmin(profile?.is_admin === true);
    }

    loadAdminFlag();
    return () => {
      isCurrentRequest = false;
    };
  }, [isDemo, supabase, userId]);

  useEffect(() => {
    const listingSnapshot = realListing;
    if (
      isDemo ||
      !supabase ||
      !userId ||
      !listingId ||
      !listingOwnerId ||
      !listingSnapshot
    ) {
      return;
    }

    let isCurrentRequest = true;

    // TODO: Should this only be called when the actual ListingChatDrawer is loaded?
    async function loadExistingThread() {
      if (!supabase) return;
      const { data: thread, error } = await supabase
        .from("chat_threads")
        .select("id, created_at, listing_id, initiator_id, owner_id")
        .match({
          listing_id: listingId,
          initiator_id: userId,
          owner_id: listingOwnerId,
        })
        .maybeSingle();

      if (error) {
        console.error("Error loading thread:", error);
        return;
      }

      if (!thread) {
        if (!isCurrentRequest) return;
        setExistingThread(null);
        return;
      }

      const { data: messages, error: messagesError } = await supabase
        .from("chat_messages")
        .select("id, content, created_at, read_at, sender_id, thread_id")
        .eq("thread_id", thread.id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("Error loading thread messages:", messagesError);
        return;
      }

      if (!isCurrentRequest) return;
      setExistingThread({
        ...thread,
        listing: listingSnapshot,
        messages: messages ?? [],
      });
    }

    loadExistingThread();
    return () => {
      isCurrentRequest = false;
    };
  }, [listingId, listingOwnerId, userId, isDemo, supabase]);

  const initialZoomLevel = 14;
  const listingDisplayNameCopy = useMemo(
    () => ({
      privateHostName: t("Listings.seo.privateHostName"),
      fallbackListingName: t("Listings.seo.fallbackListingName"),
    }),
    [t]
  );

  const listingDisplayName: string =
    providedListingDisplayName ??
    (isDemo
      ? (demoListing?.name ?? demoListing?.owner_first_name ?? "")
      : realListing
        ? getListingDisplayName(realListing, user, listingDisplayNameCopy)
        : "");

  const coordinates = realListing?.coordinates ?? null;

  if (!listing && !isDemo) {
    return null;
  }

  let listingAction: ReactNode = null;

  if (isDemo && demoListing) {
    listingAction = (
      <DemoButtonContainer>
        <Button variant="primary" width="full" href="/#contact">
          {t("Listings.read.contact", {
            name: demoListing.owner_first_name ?? demoListing.name ?? "",
          })}
        </Button>
      </DemoButtonContainer>
    );
  } else if (realListing) {
    const requiredReferenceNow = requireReferenceNow(nonDemoReferenceNow);
    listingAction = (
      <ListingChatDrawer
        isNested={presentation === "drawer"}
        user={user}
        isAdmin={isAdmin}
        listing={realListing}
        isChatDrawerOpen={isChatDrawerOpen}
        setIsChatDrawerOpen={setIsChatDrawerOpen}
        existingThread={existingThread}
        referenceNow={requiredReferenceNow}
      />
    );
  }

  return (
    <Fragment key={realListing?.id ? realListing.id : undefined}>
      <ColumnMain $presentation={presentation}>
        <ListingHeader
          presentation={presentation}
          listing={listingForDisplay}
          listingName={listingDisplayName}
          user={user}
        />

        {listingAction}

        <ListingContents $presentation={presentation}>
          {listingForDisplay?.description && (
            <ListingSection>
              <h3>
                {listingForDisplay.type === "business"
                  ? t("Listings.read.donationDetails")
                  : t("Listings.read.about")}
              </h3>
              <MultiParagraphCluster text={listingForDisplay.description} />
            </ListingSection>
          )}

          {listingForDisplay?.accepted_items &&
            listingForDisplay.accepted_items.length > 0 && (
              <ListingSection>
                <h3>{t("Listings.read.accepted")}</h3>
                <ListingItemList
                  items={listingForDisplay.accepted_items}
                  type="accepted"
                />
              </ListingSection>
            )}

          {listingForDisplay?.rejected_items &&
            listingForDisplay.rejected_items.length > 0 && (
              <ListingSection>
                <h3>{t("Listings.read.rejected")}</h3>
                <ListingItemList
                  items={listingForDisplay.rejected_items}
                  type="rejected"
                />
              </ListingSection>
            )}
        </ListingContents>
      </ColumnMain>

      {realListing && !isDemo && (
        <ColumnMinor $presentation={presentation}>
          {presentation !== "drawer" && coordinates && (
            <ListingSection $presentation={presentation}>
              <h3>{t("Listings.read.location")}</h3>

              <MapThumbnail
                height="320px"
                initialViewState={{
                  longitude: coordinates.longitude,
                  latitude: coordinates.latitude,
                  zoom: initialZoomLevel,
                }}
                interactive={false}
              >
                <Marker
                  longitude={coordinates.longitude}
                  latitude={coordinates.latitude}
                  anchor="center"
                  onClick={(event) => {
                    event.originalEvent.stopPropagation();
                    router.push(`/map?listing=${realListing.slug}`);
                  }}
                >
                  <MapPin
                    selected={true}
                    type={realListing.type ?? undefined}
                  />
                </Marker>
              </MapThumbnail>

              <MapDetails>
                {realListing.type === "residential" ? (
                  <p>
                    {t("Listings.read.residentialLocation", {
                      name: listingDisplayName,
                      area: realListing.area_name
                        ? realListing.area_name
                        : t("Listings.read.thisArea"),
                    })}
                  </p>
                ) : (
                  <p>
                    {t("Listings.read.nonResidentialLocation", {
                      name: listingDisplayName,
                      type:
                        realListing.type === "business"
                          ? t("Listings.read.businessType")
                          : realListing.type === "community"
                            ? t("Listings.read.communityType")
                            : "",
                      area: realListing.area_name ?? "",
                    })}
                  </p>
                )}

                <ButtonGroup>
                  <Button
                    variant="secondary"
                    size="small"
                    href={`/map?listing=${realListing.slug}`}
                  >
                    {t("Actions.seeNearbyListings")}
                  </Button>
                  {realListing.type !== "residential" && (
                    <>
                      <Button
                        variant="secondary"
                        size="small"
                        href={`https://maps.apple.com/?ll=${coordinates.latitude},${coordinates.longitude}&q=${encodeURIComponent(
                          realListing.name ?? ""
                        )}`}
                        target="_blank"
                      >
                        {t("Actions.openInAppleMaps")}
                      </Button>
                      <Button
                        variant="secondary"
                        size="small"
                        href={`https://maps.google.com/?q=${coordinates.latitude},${coordinates.longitude}`}
                        target="_blank"
                      >
                        {t("Actions.openInGoogleMaps")}
                      </Button>
                    </>
                  )}
                </ButtonGroup>
              </MapDetails>
            </ListingSection>
          )}

          {realListing.photos && realListing.photos.length > 0 && (
            <ListingSection
              $presentation={presentation}
              $overflowX={
                !user && realListing.type === "residential"
                  ? undefined
                  : "visible"
              }
            >
              <h3>{t("Common.photos")}</h3>
              {!user && realListing.type === "residential" ? (
                <p>
                  {t.rich("Listings.read.signInForPhotos", {
                    link: (chunks: ReactNode) => (
                      <StrongLink href="/sign-in">{chunks}</StrongLink>
                    ),
                  })}
                </p>
              ) : (
                <ListingPhotoGallery
                  listingSlug={realListing.slug}
                  presentation={presentation}
                  photos={realListing.photos}
                />
              )}
            </ListingSection>
          )}

          {realListing.links && realListing.links.length > 0 && (
            <ListingSection $presentation={presentation}>
              <h3>{t("Common.links")}</h3>
              <ListingItemList items={realListing.links} type="links" />
            </ListingSection>
          )}

          {presentation === "drawer" && (
            <ListingSection>
              <Button
                variant="secondary"
                size="small"
                width="contained"
                href={`/listings/${realListing.slug}`}
              >
                {t("Actions.viewFullListing")}
              </Button>
            </ListingSection>
          )}
        </ColumnMinor>
      )}
    </Fragment>
  );
});

export default ListingRead;

type PresentationVariantProps = {
  presentation?: Presentation;
};

type ListingSectionVariantProps = PresentationVariantProps & {
  overflowX?: "visible";
};

const sharedColumnStyles = {
  display: "flex",
  flexDirection: "column",
  gap: "3rem",
};

const fullColumnMainStyles = css`
  @media (min-width: 768px) {
    padding: 2rem 0;
    background-color: ${theme.colors.background.top};
    border: 1px solid ${theme.colors.border.base};
    border-radius: ${theme.corners.base};
  }
`;

const fullColumnMinorStyles = css`
  @media (min-width: 1280px) {
    gap: 1.5rem;
  }
`;

const fullListingContentsStyles = css`
  padding: 1.5rem 0;
  background-color: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: ${theme.corners.base};

  @media (min-width: 768px) {
    padding: 0 0.5rem;
    background-color: unset;
    border: unset;
    border-radius: unset;
  }
`;

const overflowVisibleStyles = css`
  padding: 0;
  overflow-x: visible;

  & h3 {
    padding: 0 1rem;
  }
`;

const fullSectionStyles = css`
  background-color: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: ${theme.corners.base};
  padding: 1rem 1rem 1.5rem;

  @media (min-width: 768px) {
    padding: 1rem 1.5rem 1.5rem;
  }
`;

const fullOverflowVisibleStyles = css`
  background-color: ${theme.colors.background.top};
  border: 1px solid ${theme.colors.border.base};
  border-radius: ${theme.corners.base};
  padding: 1rem 0 1.5rem;

  @media (min-width: 768px) {
    & h3 {
      padding: 0 1.5rem;
    }
  }
`;

const ColumnMain = styled.div<{ $presentation?: Presentation }>`
  display: ${sharedColumnStyles.display};
  flex-direction: ${sharedColumnStyles.flexDirection};
  gap: ${sharedColumnStyles.gap};

  ${({ $presentation }) => $presentation === "full" && fullColumnMainStyles}
`;

const ColumnMinor = styled.div<{ $presentation?: Presentation }>`
  display: ${sharedColumnStyles.display};
  flex-direction: ${sharedColumnStyles.flexDirection};
  gap: ${sharedColumnStyles.gap};

  ${({ $presentation }) => $presentation === "full" && fullColumnMinorStyles}
`;

const ListingContents = styled.div<{ $presentation?: Presentation }>`
  display: flex;
  flex-direction: column;
  gap: 3rem;

  ${({ $presentation }) =>
    $presentation === "full" && fullListingContentsStyles}
`;

const ListingSection = styled.section<{
  $presentation?: Presentation;
  $overflowX?: "visible";
}>`
  padding: 0 1rem;

  & h3 {
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: ${theme.colors.text.ui.secondary};
  }

  & p + p {
    margin-top: 0.5rem;
    color: ${theme.colors.text.ui.primary};
  }

  & p strong {
    font-weight: 500;
  }

  ${({ $overflowX }) => $overflowX === "visible" && overflowVisibleStyles}
  ${({ $overflowX, $presentation }) =>
    $overflowX === undefined && $presentation === "full" && fullSectionStyles}
  ${({ $overflowX, $presentation }) =>
    $overflowX === "visible" &&
    $presentation === "full" &&
    fullOverflowVisibleStyles}
`;

const DemoButtonContainer = styled.div`
  padding: 0 1rem;
`;

const MapDetails = styled.div`
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  & p {
    font-size: 0.875rem;
    color: ${theme.colors.text.ui.tertiary};
  }
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
`;

// Split by line breaks and render each paragraph with inline link parsing.
function renderInlineText(line: string, keyPrefix: string) {
  return parseInlineText(line).map((part, index) => {
    if (typeof part === "string") {
      return <Fragment key={`${keyPrefix}-${index}`}>{part}</Fragment>;
    }

    if (part.type === "bold") {
      return (
        <strong key={`${keyPrefix}-${index}`}>
          {part.parts.map((boldPart, boldIndex) =>
            typeof boldPart === "string" ? (
              <Fragment key={`${keyPrefix}-${index}-${boldIndex}`}>
                {boldPart}
              </Fragment>
            ) : (
              <StrongLink
                key={`${keyPrefix}-${index}-${boldIndex}`}
                href={boldPart.href}
                target="_blank"
              >
                {boldPart.text}
              </StrongLink>
            )
          )}
        </strong>
      );
    }

    return (
      <StrongLink
        key={`${keyPrefix}-${index}`}
        href={part.href}
        target="_blank"
      >
        {part.text}
      </StrongLink>
    );
  });
}

function MultiParagraphCluster({ text }: { text: string }) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>
          {paragraph.split("\n").map((line, lineIndex) => (
            <Fragment key={lineIndex}>
              {lineIndex > 0 ? <br /> : null}
              {renderInlineText(line, `${index}-${lineIndex}`)}
            </Fragment>
          ))}
        </p>
      ))}
    </>
  );
}
