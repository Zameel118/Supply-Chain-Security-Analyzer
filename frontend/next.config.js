/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Enables the slim production image in Dockerfile.prod
  output: "standalone",
};

module.exports = nextConfig;
