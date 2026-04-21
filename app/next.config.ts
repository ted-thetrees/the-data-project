import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/circle-cascade", destination: "/circle-cascade/index.html" },
    ];
  },
};

export default nextConfig;
