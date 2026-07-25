/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow the Dockerized frontend to call the backend by hostname
  reactStrictMode: true,
};

module.exports = nextConfig;
