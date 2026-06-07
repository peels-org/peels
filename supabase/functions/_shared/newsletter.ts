import {
  defaultEmailLocale,
  resolveSupportedLocale,
  type SupportedLocale,
} from "./i18n.ts";
import { getPublicSiteUrl } from "./app-origin.ts";

type LocalisedIssueDetails = {
  title: string;
  description: string;
};

type NewsletterEmailCopy = {
  subjectPrefix: string;
  preview: string;
  heading: string;
  announcement: string;
  cta: string;
  ctaHint: string;
  footerMemberPrefix: string;
  footerMemberLink: string;
  footerMemberSuffix: string;
  footerExternalPrefix: string;
  footerExternalLink: string;
  footerExternalSuffix: string;
  viewOnlinePrefix: string;
  viewOnlineLink: string;
  viewOnlineSuffix: string;
  signOff: string;
  team: string;
};

const legacyAudienceId = "34497242-6af7-4862-a2e7-356eca18176b";

const currentIssue = {
  slug: "beginning-to-look-like-compost",
  issueNumber: 2,
  locales: {
    en: {
      title: "It’s beginning to look a lot like compost",
      description:
        "We’ve made it to the end of 2025, and Peels is about to turn one. Here’s a brief update.",
    },
    es: {
      title: "Empieza a parecerse mucho al compost",
      description:
        "Ya llegamos al final de 2025 y Peels está a punto de cumplir un año. Aquí va una breve actualización.",
    },
    de: {
      title: "Es fängt an, sehr nach Kompost auszusehen",
      description:
        "Wir haben das Ende von 2025 erreicht, und Peels wird bald ein Jahr alt. Hier ist ein kurzes Update.",
    },
    "pt-BR": {
      title: "Está começando a ficar com cara de composto",
      description:
        "Chegamos ao fim de 2025 e o Peels está prestes a completar um ano. Aqui vai uma atualização breve.",
    },
    fr: {
      title: "Ça commence à ressembler à du compost",
      description:
        "Nous arrivons à la fin de 2025 et Peels va bientôt fêter sa première année. Voici une brève mise à jour.",
    },
  },
} as const satisfies {
  slug: string;
  issueNumber: number;
  locales: Record<SupportedLocale, LocalisedIssueDetails>;
};

const newsletterEmailCopy = {
  en: {
    subjectPrefix: "New Peels newsletter",
    preview: "Issue #{issueNumber} of the Peels newsletter is now live.",
    heading: "A new newsletter issue is here",
    announcement: "Issue #{issueNumber} of the Peels newsletter is now live.",
    cta: "Read this issue",
    ctaHint:
      "Open it on Peels to read the full update and share it with others.",
    footerMemberPrefix:
      "You’re receiving this email because you opted in to occasional newsletter updates from Peels. You can update your preferences ",
    footerMemberLink: "here",
    footerMemberSuffix: ".",
    footerExternalPrefix:
      "You’re receiving this email because you signed up to hear occasional updates from Peels. You can unsubscribe ",
    footerExternalLink: "here",
    footerExternalSuffix: ".",
    viewOnlinePrefix: "You can also ",
    viewOnlineLink: "read or share this issue online",
    viewOnlineSuffix: ".",
    signOff: "Best",
    team: "Peels team",
  },
  es: {
    subjectPrefix: "Nuevo boletín de Peels",
    preview:
      "Ya está disponible el número #{issueNumber} del boletín de Peels.",
    heading: "Ya está aquí un nuevo número del boletín",
    announcement:
      "Ya está disponible el número #{issueNumber} del boletín de Peels.",
    cta: "Leer este número",
    ctaHint:
      "Ábrelo en Peels para leer la actualización completa y compartirla con otras personas.",
    footerMemberPrefix:
      "Recibes este correo porque te suscribiste para recibir las novedades ocasionales de Peels. Puedes actualizar tus preferencias ",
    footerMemberLink: "aquí",
    footerMemberSuffix: ".",
    footerExternalPrefix:
      "Recibes este correo porque te apuntaste para recibir novedades ocasionales de Peels. Puedes darte de baja ",
    footerExternalLink: "aquí",
    footerExternalSuffix: ".",
    viewOnlinePrefix: "También puedes ",
    viewOnlineLink: "leer o compartir este número en línea",
    viewOnlineSuffix: ".",
    signOff: "Un abrazo",
    team: "Equipo de Peels",
  },
  de: {
    subjectPrefix: "Neuer Peels-Newsletter",
    preview:
      "Ausgabe #{issueNumber} des Peels-Newsletters ist jetzt verfügbar.",
    heading: "Eine neue Newsletter-Ausgabe ist da",
    announcement:
      "Ausgabe #{issueNumber} des Peels-Newsletters ist jetzt verfügbar.",
    cta: "Diese Ausgabe lesen",
    ctaHint:
      "Öffne sie auf Peels, um das vollständige Update zu lesen und mit anderen zu teilen.",
    footerMemberPrefix:
      "Du erhältst diese E-Mail, weil du dich für gelegentliche Newsletter-Updates von Peels angemeldet hast. Du kannst deine Einstellungen ",
    footerMemberLink: "hier",
    footerMemberSuffix: " anpassen.",
    footerExternalPrefix:
      "Du erhältst diese E-Mail, weil du dich für gelegentliche Updates von Peels angemeldet hast. Du kannst dich ",
    footerExternalLink: "hier",
    footerExternalSuffix: " abmelden.",
    viewOnlinePrefix: "Du kannst diese Ausgabe auch online ",
    viewOnlineLink: "lesen oder teilen",
    viewOnlineSuffix: ".",
    signOff: "Viele Grüsse",
    team: "Peels-Team",
  },
  "pt-BR": {
    subjectPrefix: "Novo boletim do Peels",
    preview: "A edição #{issueNumber} do boletim do Peels já está no ar.",
    heading: "Uma nova edição do boletim chegou",
    announcement: "A edição #{issueNumber} do boletim do Peels já está no ar.",
    cta: "Ler esta edição",
    ctaHint:
      "Abra no Peels para ler a atualização completa e compartilhar com outras pessoas.",
    footerMemberPrefix:
      "Você está recebendo este e-mail porque optou por receber atualizações ocasionais do boletim do Peels. Você pode atualizar as suas preferências ",
    footerMemberLink: "aqui",
    footerMemberSuffix: ".",
    footerExternalPrefix:
      "Você está recebendo este e-mail porque se inscreveu para receber atualizações ocasionais do Peels. Você pode cancelar a inscrição ",
    footerExternalLink: "aqui",
    footerExternalSuffix: ".",
    viewOnlinePrefix: "Você também pode ",
    viewOnlineLink: "ler ou compartilhar esta edição online",
    viewOnlineSuffix: ".",
    signOff: "Abraço",
    team: "Equipe Peels",
  },
  fr: {
    subjectPrefix: "Nouvelle infolettre Peels",
    preview:
      "Le numéro #{issueNumber} de l’infolettre Peels est maintenant disponible.",
    heading: "Un nouveau numéro de l’infolettre est arrivé",
    announcement:
      "Le numéro #{issueNumber} de l’infolettre Peels est maintenant disponible.",
    cta: "Lire ce numéro",
    ctaHint:
      "Ouvrez-le sur Peels pour lire la mise à jour complète et la partager autour de vous.",
    footerMemberPrefix:
      "Vous recevez cet e-mail parce que vous avez choisi de recevoir les nouvelles occasionnelles de Peels. Vous pouvez mettre à jour vos préférences ",
    footerMemberLink: "ici",
    footerMemberSuffix: ".",
    footerExternalPrefix:
      "Vous recevez cet e-mail parce que vous vous êtes inscrit pour recevoir des nouvelles occasionnelles de Peels. Vous pouvez vous désabonner ",
    footerExternalLink: "ici",
    footerExternalSuffix: ".",
    viewOnlinePrefix: "Vous pouvez aussi ",
    viewOnlineLink: "lire ou partager ce numéro en ligne",
    viewOnlineSuffix: ".",
    signOff: "Bien à vous",
    team: "Équipe Peels",
  },
} as const satisfies Record<SupportedLocale, NewsletterEmailCopy>;

const replaceIssueNumber = (text: string) =>
  text.replace("{issueNumber}", String(currentIssue.issueNumber));

export const getCurrentNewsletterIssue = (locale: SupportedLocale) => ({
  ...currentIssue,
  ...currentIssue.locales[locale],
});

export const getNewsletterEmailCopy = (locale: SupportedLocale) => {
  const copy = newsletterEmailCopy[locale];

  return {
    ...copy,
    preview: replaceIssueNumber(copy.preview),
    announcement: replaceIssueNumber(copy.announcement),
  };
};

export const getNewsletterEmailSubject = (locale: SupportedLocale) => {
  const issue = getCurrentNewsletterIssue(locale);
  const copy = getNewsletterEmailCopy(locale);

  return `${copy.subjectPrefix}: ${issue.title}`;
};

export const getNewsletterIssueUrl = (locale?: SupportedLocale) => {
  const issueUrl = new URL(
    `${getPublicSiteUrl()}/newsletter/${currentIssue.slug}`
  );

  if (locale && locale !== defaultEmailLocale) {
    issueUrl.searchParams.set("locale", locale);
  }

  return issueUrl.toString();
};

export const getNewsletterAudienceConfigs = (): Array<{
  locale: SupportedLocale;
  audienceId: string;
}> => {
  const audienceIds: Partial<Record<SupportedLocale, string | null>> = {
    en:
      Deno.env.get("NEWSLETTER_AUDIENCE_ID_EN") ??
      Deno.env.get("NEWSLETTER_AUDIENCE_ID") ??
      legacyAudienceId,
    es: Deno.env.get("NEWSLETTER_AUDIENCE_ID_ES"),
    de: Deno.env.get("NEWSLETTER_AUDIENCE_ID_DE"),
    "pt-BR": Deno.env.get("NEWSLETTER_AUDIENCE_ID_PT_BR"),
    fr: Deno.env.get("NEWSLETTER_AUDIENCE_ID_FR"),
  };

  return (
    Object.entries(audienceIds) as Array<[SupportedLocale, string | null]>
  )
    .filter(([, audienceId]) => Boolean(audienceId))
    .map(([locale, audienceId]) => ({
      locale,
      audienceId: audienceId!,
    }));
};

export const resolveNewsletterLocale = (
  value: string | null | undefined
): SupportedLocale => resolveSupportedLocale(value) ?? defaultEmailLocale;
