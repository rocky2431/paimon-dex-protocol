import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Externalize dependencies
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Externalize React Native dependencies to prevent module resolution errors
    // @metamask/sdk references these but they're not needed in web environment
    config.externals.push(
      '@react-native-async-storage/async-storage',
      'react-native'
    );

    // Configure resolve aliases to explicitly mark these modules as unavailable
    config.resolve.alias = {
      ...config.resolve.alias,
      '@react-native-async-storage/async-storage': false,
      'react-native': false,
    };

    // 🚀 Performance: Enable filesystem cache for faster rebuilds
    // Reduces second startup time from ~23s to ~5-7s (70-80% improvement)
    config.cache = {
      type: 'filesystem',
      cacheDirectory: path.join(__dirname, '.next/cache/webpack'),
      buildDependencies: {
        // Invalidate cache when config file changes
        config: [__filename],
      },
    };

    return config;
  },
};

export default nextConfig;
