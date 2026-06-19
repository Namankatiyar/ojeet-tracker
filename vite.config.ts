/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const packageJson = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as { version?: string }
const appVersion = packageJson.version ?? '0.0.0'
const appBuildId = `${appVersion}-${new Date().toISOString()}`
const isTest = !!(process.env.VITEST || process.env.NODE_ENV === 'test' || process.argv.some(arg => arg.includes('vitest')))

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
    __APP_BUILD_ID__: JSON.stringify(appBuildId),
  },
  resolve: {
    alias: isTest ? [
      { find: './pwaRegister', replacement: path.resolve(__dirname, 'src/shared/utils/pwaRegister.dummy.ts') }
    ] : []
  },
  plugins: [
    react(),
    !isTest && VitePWA({
      injectRegister: false,
      registerType: 'prompt',
      includeAssets: ['logo.png', 'og_image.jpg'],
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
      manifest: {
        name: 'OJEE-Tracker',
        short_name: 'OJEE-Tracker',
        description: 'Track your IIT JEE syllabus progress, daily planner, and study clock offline.',
        theme_color: '#6366f1',
        background_color: '#f8fafc',
        display: 'standalone',
        icons: [
          {
            src: 'logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'logo.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean) as any,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts',
    css: true,
  },
})
