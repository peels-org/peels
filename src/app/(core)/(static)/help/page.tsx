import { permanentRedirect } from "next/navigation";

import { siteConfig } from "@/config/site";
import {
  serialiseSearchParams,
  type StaticPageSearchParams,
} from "@/utils/searchParams";

type HelpPageProps = {
  searchParams?: Promise<StaticPageSearchParams>;
};

export default async function Help({ searchParams }: HelpPageProps) {
  const params = await searchParams;
  const queryString = serialiseSearchParams(params);

  permanentRedirect(
    `${siteConfig.links.contact}${queryString ? `?${queryString}` : ""}`
  );
}
