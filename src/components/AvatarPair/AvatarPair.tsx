import {
  getListingAvatar,
  getListingOwnerAvatar,
  getProfileAvatarSource,
} from "@/utils/listingUtils";

import Avatar from "@/components/Avatar";

import { css, styled } from "next-yak";

type AvatarPairRole = "initiator" | "owner";
type AvatarPairSmallest = "small" | "tiny";
type AvatarPairWidth = "fixed";

type AvatarPairListing = {
  is_demo?: boolean;
  type?: "residential" | "community" | "business" | string | null;
  avatar?: string | null;
  owner_avatar?: string | null;
};

type AvatarPairProfile = {
  avatar?: string | null;
};

type AvatarPairUser = {
  id?: string;
};

type AvatarSource =
  | {
      bucket: string;
      filename: string | null;
      alt: string;
    }
  | {
      isDemo: true;
      path: string;
      alt: string;
    }
  | {
      path: string;
      alt: string;
      isDemo?: false;
    }
  | null;

type AvatarPairProps = {
  listing?: AvatarPairListing;
  profile?: AvatarPairProfile;
  user?: AvatarPairUser | null;
  role?: AvatarPairRole;
  smallest?: AvatarPairSmallest;
  width?: AvatarPairWidth;
};

const fixedTinyWidthStyles = css`
  width: 2.5rem;
`;

const AvatarContainer = styled.div<{
  $width?: AvatarPairWidth;
  $smallest?: AvatarPairSmallest;
}>`
  margin: 0.25rem 0.625rem 0.25rem 0.25rem;
  flex-shrink: 0;
  align-self: center;
  display: flex;
  flex-direction: row;
  align-items: flex-end;

  & > *:nth-child(2) {
    margin-left: -1.25rem;
    margin-bottom: -0.25rem;
  }

  ${({ $width, $smallest }) =>
    $width === "fixed" && $smallest === "tiny" && fixedTinyWidthStyles}
`;

function toAvatarComponentProps(avatarSource: AvatarSource) {
  if (!avatarSource) {
    return {};
  }

  if ("path" in avatarSource) {
    return {
      isDemo: avatarSource.isDemo ?? false,
      src: avatarSource.path,
      alt: avatarSource.alt,
    };
  }

  return {
    bucket: avatarSource.bucket,
    filename: avatarSource.filename,
    alt: avatarSource.alt,
  };
}

export default function AvatarPair({
  listing,
  profile,
  user,
  role = "initiator",
  smallest = "small",
  width,
}: AvatarPairProps) {
  const avatarSource =
    role === "owner"
      ? (getProfileAvatarSource(profile?.avatar) as AvatarSource)
      : (getListingAvatar(listing, user) as AvatarSource);

  const primaryAvatarProps = toAvatarComponentProps(avatarSource);

  return (
    <AvatarContainer $width={width} $smallest={smallest}>
      <Avatar
        {...primaryAvatarProps}
        alt={primaryAvatarProps.alt || "The avatar for this listing"}
        size={smallest === "small" ? "medium" : "small"}
        listing={listing}
        profile={role === "owner" ? { avatar: profile?.avatar } : undefined}
      />

      {role === "initiator" && listing?.type !== "residential" && (
        <Avatar
          {...toAvatarComponentProps(
            getListingOwnerAvatar(listing) as AvatarSource
          )}
          alt="The avatar for this listing"
          size={smallest === "small" ? "small" : "tiny"}
          rotation="reverse"
          defaultImage="profile.png"
        />
      )}
    </AvatarContainer>
  );
}
