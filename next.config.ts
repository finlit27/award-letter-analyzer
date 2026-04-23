import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Allow larger file uploads (phone photos can be 5-12MB)
  // Default is 4.5MB which is too small for raw phone camera images
  serverExternalPackages: ["pdfjs-dist"],
  experimental: {
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default withSentryConfig(nextConfig, {
  silent: !process.env.CI,
});
