import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/circle-cascade", destination: "/circle-cascade/index.html" },
      { source: "/circle-cascade/controls", destination: "/circle-cascade/controls.html" },
    ];
  },
};

export default nextConfig;
