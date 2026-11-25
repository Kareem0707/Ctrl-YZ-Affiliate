const path = require('path');

/** Build explicit allowed image hostnames (zero wildcard '**' SSRF/abuse surface) */
function buildAllowedRemotePatterns() {
  const patterns = [
    // Google OAuth profile avatars
    {
      protocol: 'https',
      hostname: 'lh3.googleusercontent.com',
      pathname: '/**',
    },
    // Vercel Blob persistent cloud uploads
    {
      protocol: 'https',
      hostname: '*.public.blob.vercel-storage.com',
      pathname: '/**',
    },
    // Cloudflare R2 public bucket domain (optional)
    {
      protocol: 'https',
      hostname: '*.r2.dev',
      pathname: '/**',
    },
  ];

  // Dynamically allow configured custom R2 public CDN domain if set
  const customR2Url = process.env.R2_PUBLIC_URL;
  if (customR2Url) {
    try {
      const parsed = new URL(customR2Url);
      if (parsed.protocol === 'https:' && parsed.hostname) {
        patterns.push({
          protocol: 'https',
          hostname: parsed.hostname,
          pathname: '/**',
        });
      }
    } catch {
      // Ignore malformed env value at config load
    }
  }

  return patterns;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config) => {
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    return config;
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: buildAllowedRemotePatterns(),
  },
};

module.exports = nextConfig;
