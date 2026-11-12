/** @type {import('next').NextConfig} */
const nextConfig = {
  // A custom GitHub Pages domain serves the exported application at /.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
