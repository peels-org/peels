import { redirect } from "next/navigation";

import { siteConfig } from "@/config/site";

export default function ContributePage() {
  redirect(`${siteConfig.repoUrl}?tab=readme-ov-file#contributing-to-peels`);
}
