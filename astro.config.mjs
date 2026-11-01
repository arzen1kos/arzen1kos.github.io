// @ts-check
import { defineConfig, envField } from 'astro/config';
import react from '@astrojs/react';
import { fileURLToPath } from 'node:url';
import node from '@astrojs/node';

export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  site: 'https://arzen1kos.github.io',
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
  build: {
    assetsPrefix: '/static',
  },
  // env: {
  //   schema: {
  //     // Never bundled into client OR server output
  //     API_SECRET: envField.string({
  //       context: 'server',
  //       access: 'secret',
  //     }),
  //     // Baked in at build time, visible to client
  //     PUBLIC_API_URL: envField.string({
  //       context: 'client',
  //       access: 'public',
  //     }),
  //   },
  // },
});
