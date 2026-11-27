"use client";
import { theme } from "@/styles/theme.yak";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { useDeviceContext } from "@/hooks/useDeviceContext";
import { Drawer } from "vaul";
import Button from "@/components/Button";
import ChatWindow from "@/components/ChatWindow";
import ListingCta from "@/components/ListingCta";
import { styled } from "next-yak";

import type { Listing } from "@/types/listing";
import type { ChatThreadRecord } from "@/types/chat";

const sidebarWidth = "clamp(20rem, 30vw, 30rem)";

const StyledDrawerOverlay = styled(Drawer.Overlay)`
  background: rgba(0, 0, 0, 0.3);
  position: fixed;
  inset: 0;
`;

const ListingCtaContainer = styled.div`
  padding: 0 1rem;
  & > * {
    width: 100%;
  }
`;

const mobileTopInset = "1rem";

const StyledDrawerContent = styled(Drawer.Content)`
  background: ${theme.colors.background.top};
  border-radius: ${theme.corners.base} ${theme.corners.base} 0 0;
  overflow-x: hidden;
  &::after {
    display: none;
  }
  margin-top: ${mobileTopInset};
  height: calc(100dvh - ${mobileTopInset});
  max-height: calc(100dvh - ${mobileTopInset});
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  flex-direction: column;
  @media (min-width: 768px) {
    border-radius: ${theme.corners.base};
    height: unset;
    margin-top: unset;
    top: 24px;
    right: 24px;
    bottom: 24px;
    left: unset;
    outline: none;
    width: ${sidebarWidth};
  }
`;

type ListingChatDrawerProps = {
  isNested?: boolean;
  user: User | null;
  isAdmin?: boolean;
  listing: Listing;
  isChatDrawerOpen: boolean;
  setIsChatDrawerOpen: (open: boolean) => void;
  existingThread: ChatThreadRecord | null;
  referenceNow: string;
};

type SharedDrawerProps = {
  isNested?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction?: "right";
  children?: ReactNode;
};

// We need two drawer variants because `modal` changes which hooks vaul renders.
function ModalDrawer({ isNested, ...rest }: SharedDrawerProps) {
  const DrawerComponent = isNested ? Drawer.NestedRoot : Drawer.Root;
  return <DrawerComponent modal={true} {...rest} />;
}

function NonModalDrawer({ isNested, ...rest }: SharedDrawerProps) {
  const DrawerComponent = isNested ? Drawer.NestedRoot : Drawer.Root;
  return <DrawerComponent modal={false} {...rest} />;
}

export default function ListingChatDrawer({
  isNested,
  user,
  isAdmin = false,
  listing,
  isChatDrawerOpen,
  setIsChatDrawerOpen,
  existingThread,
  referenceNow,
}: ListingChatDrawerProps) {
  const { isDesktop, hasTouch } = useDeviceContext();

  // Mobile: always modal. Desktop: modal only if NOT a nested drawer.
  // (`!isNested` treats an omitted prop the same as `false`.)
  const shouldUseModal = !isDesktop || !isNested;

  const visibility = listing.visibility ?? undefined;
  const isStub = listing.is_stub ?? undefined;
  const isOpenDataMirrored = listing.is_open_data_mirrored ?? false;
  const isOwner = Boolean(user && listing.owner_id === user.id);

  const drawerContent = (
    <>
      <ListingCtaContainer>
        {user ? (
          isOwner || isAdmin ? (
            <ListingCta
              viewer={isOwner ? "owner" : "admin"}
              slug={listing.slug}
              visibility={visibility}
              isStub={isStub}
              isOpenDataMirrored={isOpenDataMirrored}
            />
          ) : listing.is_stub ? (
            <ListingCta
              viewer="guest"
              slug={listing.slug}
              visibility={visibility}
              isStub={true}
              isOpenDataMirrored={isOpenDataMirrored}
            />
          ) : (
            <Drawer.Trigger asChild>
              <Button variant="primary">
                Contact {listing.owner_first_name || "Host"}
              </Button>
            </Drawer.Trigger>
          )
        ) : (
          <ListingCta
            viewer="guest"
            slug={listing.slug}
            visibility={visibility}
            isStub={isStub}
            isOpenDataMirrored={isOpenDataMirrored}
          />
        )}
      </ListingCtaContainer>

      <Drawer.Portal>
        <StyledDrawerOverlay />
        <StyledDrawerContent data-vaul-no-drag={!hasTouch ? true : undefined}>
          <ChatWindow
            isDrawer={true}
            user={user}
            listing={listing}
            existingThread={existingThread}
            referenceNow={referenceNow}
          />
        </StyledDrawerContent>
      </Drawer.Portal>
    </>
  );

  const DrawerComponent = shouldUseModal ? ModalDrawer : NonModalDrawer;

  return (
    <DrawerComponent
      isNested={isNested}
      open={isChatDrawerOpen}
      onOpenChange={setIsChatDrawerOpen}
      direction={isDesktop ? "right" : undefined}
    >
      {drawerContent}
    </DrawerComponent>
  );
}
