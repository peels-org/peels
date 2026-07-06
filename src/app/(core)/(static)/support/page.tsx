import { permanentRedirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import {
  serialiseSearchParams,
  type StaticPageSearchParams,
} from "@/utils/searchParams";

type SupportPageProps = {
  searchParams?: Promise<StaticPageSearchParams>;
};

export default async function Support({ searchParams }: SupportPageProps) {
  const params = await searchParams;
  const queryString = serialiseSearchParams(params);

  permanentRedirect(
    `${siteConfig.links.contact}${queryString ? `?${queryString}` : ""}`
  );
}
