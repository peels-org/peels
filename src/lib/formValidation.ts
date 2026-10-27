// Trim blank characters from both the start and end of a name (listings, etc.)
export function validateName(name: unknown): {
  isValid: boolean;
  value?: string;
  error?: string;
} {
  const trimmedName = name?.toString().trim();
  if (!trimmedName) {
    return {
      isValid: false,
      error: "You can’t have an empty name.",
    };
  }
  return {
    isValid: true,
    value: trimmedName,
  };
}

export type FirstNameErrorCode =
  | "empty"
  | "tooShort"
  | "tooLong"
  | "forbiddenContent"
  | "reserved"
  | "invalidChars";

/** NBSP/em space/etc. → ASCII space so spacing between words validates reliably */
function normalizeSpacingForFirstName(s: string): string {
  return s
    .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000\uFEFF]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function validateFirstName(name: unknown): {
  isValid: boolean;
  value?: string;
  error?: FirstNameErrorCode;
} {
  const raw = name?.toString().trim();
  if (!raw) {
    return { isValid: false, error: "empty" };
  }

  const normalized = raw.normalize("NFKC");
  const collapsed = normalizeSpacingForFirstName(normalized);
  if (!collapsed) {
    return { isValid: false, error: "empty" };
  }
  if (collapsed.length < 2) {
    return { isValid: false, error: "tooShort" };
  }
  if (collapsed.length > 24) {
    return { isValid: false, error: "tooLong" };
  }

  if (
    /[@/\\]/.test(collapsed) ||
    /\bwww\./i.test(collapsed) ||
    /https?:\/\//i.test(collapsed)
  ) {
    return { isValid: false, error: "forbiddenContent" };
  }

  if (/\.(?:com|org|net|io|app)\b/i.test(collapsed)) {
    return { isValid: false, error: "forbiddenContent" };
  }

  const lower = collapsed.toLowerCase();

  if (/p[e3]els|pe[e3]ls|pe[e3]l[s5]/i.test(collapsed)) {
    return { isValid: false, error: "reserved" };
  }

  if (
    lower === "peels" ||
    lower.startsWith("peels ") ||
    lower.startsWith("peels-") ||
    lower.startsWith("peels.")
  ) {
    return { isValid: false, error: "reserved" };
  }

  if (/(^|\s)peels(\s|\.|-|$)/i.test(collapsed)) {
    return { isValid: false, error: "reserved" };
  }

  const embeddedPeelsPhrases = [
    "peels support",
    "peels team",
    "peels staff",
    "customer service",
  ];
  for (const phrase of embeddedPeelsPhrases) {
    if (lower.includes(phrase)) {
      return { isValid: false, error: "reserved" };
    }
  }

  const reservedExact = new Set([
    "support",
    "admin",
    "administrator",
    "moderator",
    "team",
    "official",
    "staff",
    "helpdesk",
    "help",
    "trust",
    "safety",
    "security",
    "system",
    "service",
    "root",
    "moderation",
  ]);

  if (reservedExact.has(lower)) {
    return { isValid: false, error: "reserved" };
  }

  // Letters, spaces, ASCII hyphen/apostrophe, typographic apostrophe — no `\p{L}` here
  // because Pigment’s parser treats `{` in `/\p{L}/` like CSS and breaks the build.
  const allowedFirstNameChars =
    /^[\sa-zA-Z'\u2019\u00C0-\u024F\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0980-\u09FF\u0E00-\u0E7F\u3040-\u309F\u30A0-\u30FF\u3400-\u9FFF\uAC00-\uD7AF-]+$/;
  if (!allowedFirstNameChars.test(collapsed)) {
    return { isValid: false, error: "invalidChars" };
  }

  return { isValid: true, value: collapsed };
}

export const FIELD_CONFIGS = {
  firstName: {
    type: "text",
    placeholder: "Your first name or a nickname",
    required: true,
    minLength: 2,
  },
  email: {
    type: "email",
    placeholder: "you@example.com",
    required: true,
  },
  password: {
    type: "password",
    placeholder: "••••••••••••",
    required: true,
    // Match Supabase Auth password length policy (Have I Been Pwned checks remain server-side).
    minLength: 8,
  },
} as const;
