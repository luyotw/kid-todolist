/// <reference types="vitest" />
import { execSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';

function appBuildId(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return String(Date.now());
  }
}

function injectIndexScripts(buildId: string): Plugin {
  const scripts = `<script>(function(){var k='kid-todolist:sw-purged';try{if(sessionStorage.getItem(k))return}catch(e){}(async function(){var changed=false;if('serviceWorker'in navigator){var rs=await navigator.serviceWorker.getRegistrations();if(rs.length){await Promise.all(rs.map(function(r){return r.unregister()}));changed=true}}if('caches'in window){var ks=await caches.keys();if(ks.length){await Promise.all(ks.map(function(c){return caches.delete(c)}));changed=true}}if(changed){try{sessionStorage.setItem(k,'1')}catch(e){}location.reload()}})()})();</script><script>(function(){var id="${buildId}",k="kid-todolist:build";try{var p=localStorage.getItem(k);localStorage.setItem(k,id);if(p&&p!==id){location.reload();return}}catch(e){}})();</script>`;
  return {
    name: 'inject-index-scripts',
    transformIndexHtml(html) {
      return html.replace('</head>', `${scripts}</head>`);
    },
  };
}

export default defineConfig({
  define: {
    'import.meta.env.VITE_APP_BUILD_ID': JSON.stringify(appBuildId()),
  },
  plugins: [react(), injectIndexScripts(appBuildId())],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    css: false,
  },
});
