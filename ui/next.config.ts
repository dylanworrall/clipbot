import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["child_process"],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
