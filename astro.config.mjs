// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
// import node from '@astrojs/node';
import netlify from '@astrojs/netlify';

export default defineConfig({
  output: 'server',
  // adapter: node({ mode: 'standalone' }),
  adapter: netlify(),
  // site: 'https://arzen1kos.github.io',
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      proxy: {
        '/api/portfolio': 'http://127.0.0.1:8000',
        '/api/session': 'http://127.0.0.1:8000',
        '/admin': 'http://127.0.0.1:8000',
        '/static': 'http://127.0.0.1:8000',
      },
    },
  },
});
