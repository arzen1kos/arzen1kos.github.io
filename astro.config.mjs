// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api': 'http://127.0.0.1:8000',
        '/admin': 'http://127.0.0.1:8000',
        '/static': 'http://127.0.0.1:8000',
      },
    },
  },
  build: {
    assetsPrefix: '/static',
  },
});
