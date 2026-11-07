import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  // Keep jsdom/DOMPurify outside the webpack bundle so runtime file paths
  // (e.g. default-stylesheet) resolve from node_modules instead of .next/.
  serverExternalPackages: ["jsdom", "isomorphic-dompurify", "dompurify"],
};

export default nextConfig;
