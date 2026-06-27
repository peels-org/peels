export const siteConfig = {
  name: "Peels",
  description: "Find a home for your food scraps, wherever you are.",
  url: "https://www.peels.org",
  repoUrl: "https://github.com/dnywh/peels",
  links: {
    about: "/",
    newsletter: "/newsletter",
    partners: "/partners",
    share: "/share",
    help: "/help",
    terms: "/terms",
    privacy: "/privacy",
    support: "/help",
    contact: "/help#contact",
    colophon: "/colophon",
    join: "/sign-up",
  },
  encodedEmail: {
    support: "c3VwcG9ydEBwZWVscy5hcHA=",
    dw: "ZGFubnlAcGVlbHMuYXBw",
    general: "dGVhbUBwZWVscy5hcHA=",
    newsletter: "bmV3c2xldHRlckBwZWVscy5hcHA=",
  },
  meta: {
    explainer:
      "a community platform for connecting folks with food scraps to those who compost",
    keywords: [
      "food waste",
      "food scraps",
      "share waste",
      "sharewaste",
      "makesoil",
      "compost near me",
      "compost drop-off",
      "food scrap drop-off",
    ],
  },
} as const;
