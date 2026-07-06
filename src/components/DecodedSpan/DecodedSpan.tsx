"use client";

import type { PropsWithChildren } from "react";
import { decodeEncodedEmail } from "@/utils/email";

function DecodedSpan({ children }: PropsWithChildren<{ children: string }>) {
  return <span>{decodeEncodedEmail(children)}</span>;
}

export default DecodedSpan;
