const fs = require("fs");
const path = require("path");

const versionPath = path.join(__dirname, "..", "VERSION");
const appVersion = fs.existsSync(versionPath)
  ? fs.readFileSync(versionPath, "utf8").trim()
  : "0.0.0";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  env: {
    NEXT_PUBLIC_APP_VERSION: appVersion,
  },
};

module.exports = nextConfig;
