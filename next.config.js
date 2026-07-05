import createNextIntlPlugin from "next-intl/plugin";
import createMDX from "@next/mdx";
import { withYak } from "next-yak/withYak";

const storageRemotePatterns = [
  {
    protocol: "https",
    hostname: "mfnaqdyunuafbwukbbyr.supabase.co",
    port: "",
    pathname: "/storage/v1/object/public/**",
    search: "",
  },
  {
    protocol: "http",
    hostname: "127.0.0.1",
    port: "54331",
    pathname: "/storage/v1/object/public/**",
    search: "",
  },
  {
    protocol: "http",
    hostname: "localhost",
    port: "54331",
    pathname: "/storage/v1/object/public/**",
    search: "",
  },
];

if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  try {
    const { protocol, hostname, port } = new URL(
      process.env.NEXT_PUBLIC_SUPABASE_URL
    );

    storageRemotePatterns.unshift({
      protocol: protocol.replace(":", ""),
      hostname,
      port,
      pathname: "/storage/v1/object/public/**",
      search: "",
    });
  } catch {
    // Ignore invalid URLs in local env setup and fall back to defaults above.
  }
}

const uniqueStorageRemotePatterns = storageRemotePatterns.filter(
  (pattern, index, allPatterns) =>
    index ===
    allPatterns.findIndex(
      (candidate) =>
        candidate.protocol === pattern.protocol &&
        candidate.hostname === pattern.hostname &&
        candidate.port === pattern.port &&
        candidate.pathname === pattern.pathname &&
        candidate.search === pattern.search
    )
);

const shouldAllowLocalStorageImages =
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("127.0.0.1") ||
  process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("localhost") ||
  false;

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configure `pageExtensions` to include markdown and MDX files
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  // Allowed list of image formats, hosts
  images: {
    formats: ["image/avif", "image/webp"],
    // Increase expiration (Max Age) of cache
    // https://vercel.com/docs/image-optimization#remote-images-cache-key
    // https://vercel.com/docs/image-optimization/managing-image-optimization-costs
    // https://nextjs.org/docs/app/api-reference/components/image#caching-behavior
    // Can be safetly increased as all user-generated imagery use uniques slugs
    minimumCacheTTL: 2678400, // 31 days (default value is `60`, i.e. one minute)
    dangerouslyAllowLocalIP: shouldAllowLocalStorageImages,
    // Define where remote images can be pulled from
    remotePatterns: uniqueStorageRemotePatterns,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

const withMDX = createMDX({
  // Add markdown plugins here, as desired
});

export default withYak({}, withNextIntl(withMDX(nextConfig)));
