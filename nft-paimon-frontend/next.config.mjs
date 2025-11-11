/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // ⚠️ 在生产构建时忽略 TypeScript 错误
    // 本地开发时仍会进行类型检查
    ignoreBuildErrors: true,
  },
  eslint: {
    // ⚠️ 在生产构建时忽略 ESLint 错误
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    config.externals.push('pino-pretty', 'lokijs', 'encoding');
    return config;
  },
};

export default nextConfig;
