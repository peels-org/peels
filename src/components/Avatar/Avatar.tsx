import RemoteImage, {
  type RemoteImageProps,
} from "@/components/RemoteImage/RemoteImage";
import Image from "next/image";
import { css, styled } from "next-yak";
import { theme } from "@/styles/theme.yak";
import type { ComponentProps, CSSProperties } from "react";

const SIZE_MASSIVE = 112;
const SIZE_LARGE = 96;
const SIZE_MEDIUM = 64;
const SIZE_SMALL = 40;
const SIZE_TINY = 24;

type AvatarSize = "massive" | "large" | "medium" | "small" | "tiny";
type AvatarRotation = "normal" | "reverse";

type AvatarListing = {
  type?: "residential" | "community" | "business" | string | null;
  owner_avatar?: string | null;
  avatar?: string | null;
};

type AvatarProfile = {
  avatar?: string | null;
};

type AvatarStyleProps = {
  $size?: AvatarSize;
  $rotation?: AvatarRotation;
};

export type AvatarProps = Omit<RemoteImageProps, "width" | "height"> & {
  size?: AvatarSize;
  rotation?: AvatarRotation;
  isDemo?: boolean;
  src?: ComponentProps<typeof Image>["src"];
  alt?: string;
  defaultImage?: string;
  listing?: AvatarListing;
  profile?: AvatarProfile;
  style?: CSSProperties;
};

const massiveAvatarStyles = css`
  border-radius: ${theme.corners.avatar.large};
  box-shadow:
    0px 0px 0px 4px ${theme.colors.background.top},
    0px 0px 0px 5.5px ${theme.colors.border.base},
    3px 4px 0px 5px ${theme.colors.border.stark};
`;

const mediumAvatarStyles = css`
  border-radius: ${theme.corners.avatar.large};
  box-shadow:
    0px 0px 0px 3px ${theme.colors.background.top},
    0px 0px 0px 4.5px ${theme.colors.border.base},
    2px 3px 0px 3px ${theme.colors.border.stark};
`;

const smallAvatarStyles = css`
  border-radius: ${theme.corners.avatar.small};
  box-shadow:
    0px 0px 0px 2px ${theme.colors.background.top},
    0px 0px 0px 3.5px ${theme.colors.border.base},
    2px 2.5px 0px 2.15px ${theme.colors.border.stark};
`;

const normalRotationStyles = css`
  transform: rotate(${theme.rotations.avatar});
`;

const reverseRotationStyles = css`
  transform: rotate(calc(${theme.rotations.avatar} * -1.5));
`;

const StyledRemoteImage = styled(RemoteImage)<AvatarStyleProps>`
  overflow: hidden;
  object-fit: cover;
  flex-shrink: 0;
  background: ${theme.colors.background.pit};

  ${({ $size = "medium" }) => {
    if ($size === "massive" || $size === "large") return massiveAvatarStyles;
    if ($size === "medium") return mediumAvatarStyles;
    return smallAvatarStyles;
  }}

  ${({ $rotation = "normal" }) =>
    $rotation === "reverse" ? reverseRotationStyles : normalRotationStyles}
`;

const StyledNextImage = styled(Image)<AvatarStyleProps>`
  overflow: hidden;
  object-fit: cover;
  flex-shrink: 0;
  background: ${theme.colors.background.pit};

  ${({ $size = "medium" }) => {
    if ($size === "massive" || $size === "large") return massiveAvatarStyles;
    if ($size === "medium") return mediumAvatarStyles;
    return smallAvatarStyles;
  }}

  ${({ $rotation = "normal" }) =>
    $rotation === "reverse" ? reverseRotationStyles : normalRotationStyles}
`;

const SIZE_MAP: Record<AvatarSize, number> = {
  massive: SIZE_MASSIVE,
  large: SIZE_LARGE,
  medium: SIZE_MEDIUM,
  small: SIZE_SMALL,
  tiny: SIZE_TINY,
};

function Avatar({
  size = "medium",
  rotation = "normal",
  isDemo = false,
  src,
  defaultImage,
  listing,
  profile,
  alt = "Avatar",
  style,
  bucket,
  filename,
  ...props
}: AvatarProps) {
  const dimensions = SIZE_MAP[size];
  const sharedProps = {
    $size: size,
    $rotation: rotation,
    width: dimensions,
    height: dimensions,
    alt,
    style,
    ...props,
  };

  if (profile) {
    return (
      <StyledRemoteImage
        bucket="avatars"
        filename={profile.avatar}
        defaultImage="profile.png"
        {...sharedProps}
      />
    );
  }

  if (isDemo && src) {
    return <StyledNextImage src={src} {...sharedProps} />;
  }

  if (listing) {
    const computedDefaultImage =
      listing.type === "residential"
        ? "profile.png"
        : listing.type === "community"
          ? "community.png"
          : "business.png";

    return (
      <StyledRemoteImage
        bucket={listing.type === "residential" ? "avatars" : "listing_avatars"}
        filename={
          listing.type === "residential" ? listing.owner_avatar : listing.avatar
        }
        defaultImage={defaultImage || computedDefaultImage}
        {...sharedProps}
      />
    );
  }

  return (
    <StyledRemoteImage
      bucket={bucket}
      filename={filename}
      defaultImage={defaultImage || "profile.png"}
      {...sharedProps}
    />
  );
}

export default Avatar;
