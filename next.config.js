/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ensure we don't use turbopack for production builds to avoid hangs
  experimental: {
    turbo: {
      // empty rules to ensure default behavior
    }
  }
};

module.exports = nextConfig;
