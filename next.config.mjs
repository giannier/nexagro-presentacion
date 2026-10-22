/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    // Logos are consumed as raw WebGL textures, never through next/image.
    unoptimized: true,
  },
  // Emits a plain static `out/` folder (HTML/CSS/JS, no server) so this fork can be
  // deployed to any plain host — git or FTP — with no Node runtime required at all.
  output: 'export',
};

export default nextConfig;
