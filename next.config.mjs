/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages serves this repository under /alveary-planning-app.
  output: "export",
  trailingSlash: true,
  basePath: process.env.GITHUB_PAGES === "true" ? "/alveary-planning-app" : "",
  images: { unoptimized: true },
};

export default nextConfig;
