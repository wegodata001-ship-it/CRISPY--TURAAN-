/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["html2canvas-pro"],
  // Native Skia binary — must stay external or Vercel webpack fails on .node files
  serverExternalPackages: ["@napi-rs/canvas"],
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
  },
  webpack: (config) => {
    // Never attempt to parse platform .node binaries from @napi-rs/canvas
    config.externals = config.externals || [];
    if (Array.isArray(config.externals)) {
      config.externals.push("@napi-rs/canvas");
    }
    return config;
  },
};

export default nextConfig;
