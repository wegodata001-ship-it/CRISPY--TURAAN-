/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["html2canvas-pro"],
  // Native Skia binary — must stay external or Vercel webpack fails on .node files.
  // firebase-admin → jwks-rsa require()'s jose; jose 6 is ESM-only and crashes
  // Vercel's CJS serverless loader (ERR_REQUIRE_ESM). Keep these unbundled so
  // the npm override to jose@5 (CJS+ESM) is what Node actually require()s.
  serverExternalPackages: ["@napi-rs/canvas", "firebase-admin", "jwks-rsa", "jose"],
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
