const TOR_EXIT_LIST_URL = "https://check.torproject.org/torbulkexitlist";
const CACHE_TTL_MS = 60 * 60 * 1000;

type TorExitCache = {
  expiresAt: number;
  ips: Set<string>;
};

let cache: TorExitCache | null = null;
let inFlight: Promise<Set<string>> | null = null;

/** Exported for unit tests. */
export function parseTorExitList(body: string): Set<string> {
  const ips = new Set<string>();

  for (const line of body.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }
    ips.add(trimmed);
  }

  return ips;
}

/** Exported for unit tests. */
export function getClientIpFromHeaders(
  headerList: Headers | { get(name: string): string | null }
): string | null {
  const realIp = headerList.get("x-real-ip")?.trim();
  if (realIp) {
    return realIp;
  }

  const forwarded = headerList.get("x-forwarded-for")?.trim();
  if (!forwarded) {
    return null;
  }

  const first = forwarded.split(",")[0]?.trim();
  return first || null;
}

async function fetchTorExitIps(): Promise<Set<string>> {
  if (cache && cache.expiresAt > Date.now()) {
    return cache.ips;
  }

  if (inFlight) {
    return inFlight;
  }

  inFlight = (async () => {
    try {
      const response = await fetch(TOR_EXIT_LIST_URL, {
        headers: { Accept: "text/plain" },
        signal: AbortSignal.timeout(8_000),
      });

      if (!response.ok) {
        throw new Error(`Tor exit list HTTP ${response.status}`);
      }

      const ips = parseTorExitList(await response.text());
      cache = { ips, expiresAt: Date.now() + CACHE_TTL_MS };
      return ips;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}

/**
 * Returns true when the given IP is a known Tor exit.
 * On list fetch failure, returns false so signup stays available.
 */
export async function isTorExitIp(
  ip: string | null | undefined
): Promise<boolean> {
  if (!ip) {
    return false;
  }

  try {
    const ips = await fetchTorExitIps();
    return ips.has(ip);
  } catch (error) {
    console.error("Failed to load Tor exit list; allowing request", error);
    return false;
  }
}

export async function isRequestFromTorExit(
  headerList: Headers | { get(name: string): string | null }
): Promise<boolean> {
  return isTorExitIp(getClientIpFromHeaders(headerList));
}

/** Test helper to clear the in-memory cache between cases. */
export function resetTorExitCacheForTests(): void {
  cache = null;
  inFlight = null;
}
