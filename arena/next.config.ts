import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  devIndicators: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "10.0.2.2:3000",
        "10.0.2.2",
        "localhost",
        "127.0.0.1",
        "*.local",
        "*.localhost",
        "*.nip.io",
      ],
    },
  },
  turbopack: {
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
