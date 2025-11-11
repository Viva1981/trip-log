/** @type {import("next").NextConfig} */
const nextConfig = {
  eslint: {
    // Első build: ne álljon meg ESLint miatt
    ignoreDuringBuilds: true
  },
  typescript: {
    // Első build: ne álljon meg TS típushiba miatt
    ignoreBuildErrors: true
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  }
};
export default nextConfig;
