import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude runtime-only directories from Vercel's Node File Tracing.
  // These folders only exist at runtime (user uploads / generated models)
  // and must NOT be statically traced during build — tracing them with
  // Windows-absolute paths causes ENOENT on Vercel's Linux runners.
  outputFileTracingExcludes: {
    "*": [
      "./public/generated/**",
      "./public/uploads/**",
    ],
  },
};

export default nextConfig;
