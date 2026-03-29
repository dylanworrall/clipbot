import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["child_process", "better-sqlite3"],
  turbopack: {
    root: process.cwd(),
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2gb",
    },
  },
  // Allow large file uploads on all API routes
  api: {
    bodyParser: {
      sizeLimit: "500mb",
    },
  },
} as NextConfig;

export default nextConfig;
