import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { noindexHeaders } from "./src/lib/seo";

const nextConfig: NextConfig = {
  // Allow larger file uploads (phone photos can be 5-12MB)
  // Default is 4.5MB which is too small for raw phone camera images
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
  // Keep private analysis pages and the after-payment page out of search results (src/lib/seo.ts).
  async headers() {
    return noindexHeaders();
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
