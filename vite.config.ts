/// <reference types="vitest" />
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { PWA_MANIFEST } from './src/lib/pwa/config';

function appBuildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return String(Date.now());
  }
}

function injectBuildReloadScript(): Plugin {
  const buildId = appBuildId();
  const script = `<script>(function(){var id="${buildId}",k="kid-todolist:build";try{var p=localStorage.getItem(k);localStorage.setItem(k,id);if(p&&p!==id){location.reload();return}}catch(e){}})();</script>`;
  return {
    name: 'inject-build-reload-script',
    transformIndexHtml(html) {
      return html.replace('</head>', `${script}</head>`);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    injectBuildReloadScript(),
    VitePWA({
      injectRegister: false,
      selfDestroying: true,
      includeAssets: ['icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        ...PWA_MANIFEST,
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: [],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
