import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Server Actions body size is separate from our own MAX_RAW_BODY_BYTES
  // check in lib/sync/validate.ts, which guards the /api/documents/*/sync
  // route specifically; this caps the framework-level default as a second
  // line of defense against oversized request bodies generally.
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
