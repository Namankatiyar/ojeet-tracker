/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf-8')
) as { version?: string };
const appVersion = packageJson.version ?? '0.0.0';
const appBuildId = `${appVersion}-${new Date().toISOString()}`;
const isTest = !!(
  process.env.VITEST ||
  process.env.NODE_ENV === 'test' ||
  process.argv.some((arg) => arg.includes('vitest'))
);

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  esbuild: {
    drop: ['console', 'debugger'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-framer': ['framer-motion'],
          'vendor-charts': ['chart.js', 'react-chartjs-2'],
          'vendor-icons': ['lucide-react'],
        },
      },
    },
  },
  resolve: {
    alias: isTest
      ? [
          {
            find: './pwaRegister',
            replacement: path.resolve(__dirname, 'src/shared/utils/pwaRegister.dummy.ts'),
          },
        ]
      : [],
  },
  plugins: [
    react(),
    !isTest &&
      VitePWA({
        injectRegister: false,
        registerType: 'autoUpdate',
        includeAssets: ['logo.png', 'og_image.jpg'],
        workbox: {
          cleanupOutdatedCaches: true,
          clientsClaim: true,
          skipWaiting: true,
          globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,json,webmanifest}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-fonts-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
            {
              urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif|ico)$/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'static-image-assets',
                expiration: {
                  maxEntries: 60,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
                cacheableResponse: {
                  statuses: [0, 200],
                },
              },
            },
          ],
        },
        manifest: {
          name: 'OJEE-Tracker',
          short_name: 'OJEE-Tracker',
          description:
            'Track your IIT JEE syllabus progress, daily planner, and study clock offline.',
          theme_color: '#06b6d4',
          background_color: '#f8fafc',
          display: 'standalone',
          icons: [
            {
              src: 'logo.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: 'logo.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        },
      }),
  ].filter(Boolean) as any,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  },
});
