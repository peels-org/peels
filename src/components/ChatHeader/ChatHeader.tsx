import { useRouter } from "next/navigation";
import { Drawer } from "vaul"; // TODO: Import only used subcomponents?
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"; // TODO: Build own version: https://www.joshwcomeau.com/snippets/react-components/visually-hidden/
import { siteConfig } from "@/config/site";
import AvatarPair from "@/components/AvatarPair";
import IconButton from "@/components/IconButton";
import DropdownMenu from "@/components/DropdownMenu";
import Button from "@/components/Button";
import ButtonToDialog from "@/components/ButtonToDialog";
import EncodedEmailLink from "@/components/EncodedEmailLink";

import { styled } from "next-yak";
import { theme } from "@/styles/theme.yak";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import type { ChatListing, ChatThreadRecord, ChatUser } from "@/types/chat";
import type { DemoListing } from "@/types/listing";

const StyledChatHeader = styled.header<{ $isDrawer?: boolean }>`
  display: flex;
  flex-direction: row;
  align-items: flex-start;
  gap: ${({ $isDrawer }) => ($isDrawer ? "0.75rem" : "1rem")};
  border-bottom: 1px solid ${theme.colors.border.base};
  background-color: ${theme.colors.background.top};
  padding: ${({ $isDrawer }) => ($isDrawer ? "0.75rem" : "1rem")};

  @media (min-width: 768px) {
    gap: 1rem;
    padding: 1rem;
  }
`;

const AvatarContainer = styled.div`
  display: flex;
`;

// Match styling in ListingHeader (but keep separate because of complicated alignment logic here)
const TitleBlock = styled.div`
  flex: 1;
  align-self: center;
  font-size: 1rem;
  display: flex;
  flex-direction: column;
  align-items: stretch;

  & :is(h1, h3) {
    font-size: 1rem;
    line-height: 120%;
    color: ${theme.colors.text.ui.primary};
  }

  & p {
    font-size: 0.875rem;
    line-height: 125%;
    color: ${theme.colors.text.ui.quaternary};
  }

  @media (min-width: 768px) {
    & :is(h1, h3),
    & h2 {
      text-align: left;
    }

    & :is(h1, h3) {
      font-size: 1.25rem;
    }
  }
`;

// Style the avatar and title block based on the same conditions as the <- button:
// !isDrawer, and at a certain breakpoint
// We center align the children in this case to account for the left-aligned <- button
const MainContents = styled.div<{ $isDrawer?: boolean }>`
  flex: 1;
  display: flex;
  flex-direction: row;
  gap: 0.5rem;

  & ${TitleBlock} {
    text-align: left;
  }

  ${({ $isDrawer }) =>
    $isDrawer === false &&
    `
      flex-direction: column;
      align-items: center;
      gap: 1rem;

      & ${TitleBlock} {
        text-align: center;
        gap: 0;
      }

      @media (min-width: 768px) {
        flex-direction: inherit;

        & ${TitleBlock} {
          text-align: inherit;
          gap: 0.25rem;
        }
      }
    `}
`;

type ChatHeaderProps = {
  thread?: ChatThreadRecord | null;
  listing: ChatListing | DemoListing;
  user?: ChatUser | null;
  isDrawer?: boolean;
  isDemo?: boolean;
};

type ChatRole = "initiator" | "owner";

function isChatListing(
  listing: ChatListing | DemoListing
): listing is ChatListing {
  return (
    "slug" in listing || "owner_id" in listing || "owner_avatar" in listing
  );
}

function getChatRole(
  thread: ChatThreadRecord | null | undefined,
  user: ChatUser | null | undefined,
  listing: ChatListing | DemoListing,
  isDemo: boolean
): ChatRole {
  if (isDemo) {
    return "initiator";
  }

  if (thread?.initiator_id && thread.initiator_id === user?.id) {
    return "initiator";
  }

  if (!thread) {
    if (isChatListing(listing) && listing.owner_id === user?.id) {
      return "owner";
    }

    return "initiator";
  }

  return "owner";
}

function getListingSummary(
  listing: ChatListing | DemoListing,
  role: ChatRole,
  t: ReturnType<typeof useTranslations>
) {
  if (role !== "initiator") {
    return null;
  }

  if (listing.type === "residential") {
    return listing.area_name
      ? t("Listings.read.residentOf", { area: listing.area_name })
      : t("Listings.read.localResident");
  }

  return listing.name ?? null;
}

function ChatHeader({
  thread,
  listing,
  user,
  isDrawer = false,
  isDemo = false,
}: ChatHeaderProps) {
  const t = useTranslations();
  const router = useRouter();

  const role = getChatRole(thread, user, listing, isDemo);
  const chatListing = isChatListing(listing) ? listing : null;

  const otherPersonName =
    role === "initiator"
      ? listing.owner_first_name || ""
      : thread?.initiator_first_name || "";
  const listingSummary = getListingSummary(listing, role, t);
  const HeadingTag = isDemo ? "h3" : "h1";

  return (
    <StyledChatHeader $isDrawer={isDrawer}>
      {!isDrawer && !isDemo && (
        <IconButton
          breakpoint="sm"
          icon="back"
          onClick={() => router.push("/chats")}
        />
      )}
      {isDrawer && (
        <>
          <VisuallyHidden.Root>
            <Drawer.Title>{t("Chat.drawerTitle")}</Drawer.Title>
            <Drawer.Description>
              {t("Chat.drawerDescription")}
            </Drawer.Description>
          </VisuallyHidden.Root>
        </>
      )}

      <MainContents $isDrawer={isDrawer}>
        {/* Handle either listing avatar and owner avatar combo OR initiator's avatar */}
        <AvatarContainer>
          <AvatarPair
            listing={role === "initiator" ? listing : undefined}
            profile={
              role === "owner"
                ? { avatar: thread?.initiator_avatar }
                : undefined
            }
            user={user}
            smallest="tiny"
            width="fixed"
            role={role}
          />
        </AvatarContainer>

        <TitleBlock>
          <HeadingTag>{otherPersonName}</HeadingTag>
          {listingSummary && <p>{listingSummary}</p>}
        </TitleBlock>
      </MainContents>

      {!isDrawer && !isDemo && (
        <DropdownMenu.Root>
          <DropdownMenu.Button as={IconButton} icon="overflow" />

          <DropdownMenu.Items anchor={{ to: "bottom end", gap: "4px" }}>
            {role === "initiator" && (
              <DropdownMenu.Item>
                <Button
                  onClick={() => {
                    if (!chatListing?.slug) return;
                    router.push(`/listings/${chatListing.slug}`);
                  }}
                  variant="secondary"
                  size="small"
                  disabled={!chatListing?.slug}
                >
                  {t("Actions.viewListing")}
                </Button>
              </DropdownMenu.Item>
            )}
            <DropdownMenu.Item>
              <ButtonToDialog
                variant="danger"
                size="small"
                initialButtonText={t("Chat.report")}
                dialogTitle={t("Chat.reportTitle")}
                cancelButtonText={t("Actions.done")}
              >
                {t.rich("Chat.reportBody", {
                  name: otherPersonName,
                  link: (chunks: ReactNode) => (
                    <EncodedEmailLink address={siteConfig.encodedEmail.team}>
                      {chunks}
                    </EncodedEmailLink>
                  ),
                })}
              </ButtonToDialog>
            </DropdownMenu.Item>
          </DropdownMenu.Items>
        </DropdownMenu.Root>
      )}

      {isDrawer && (
        <Drawer.Close asChild>
          <IconButton icon="close" />
        </Drawer.Close>
      )}
    </StyledChatHeader>
  );
}

export default ChatHeader;
