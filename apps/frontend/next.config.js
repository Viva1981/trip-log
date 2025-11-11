/** @type {import("next").NextConfig} */
module.exports = {
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }]
  }
};
