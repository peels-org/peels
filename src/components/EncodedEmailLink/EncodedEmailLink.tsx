"use client";

import Link from "next/link";
import StrongLink from "@/components/StrongLink";
import type { PropsWithChildren } from "react";
import { decodeEncodedEmail } from "@/utils/email";

type EncodedEmailLinkProps = PropsWithChildren<{
  as?: "plain" | "strong";
  address: string;
}>;

export default function EncodedEmailLink({
  as = "strong",
  address,
  children,
}: EncodedEmailLinkProps) {
  const decodedEmail = decodeEncodedEmail(address);

  if (as === "plain") {
    return <Link href={`mailto:${decodedEmail}`}>{children}</Link>;
  }

  return (
    <StrongLink as="anchor" href={`mailto:${decodedEmail}`}>
      {children}
    </StrongLink>
  );
}
