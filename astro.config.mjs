// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import node from '@astrojs/node';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  site: 'https://arzen1kos.github.io',
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  base: '/',
  integrations: [react()],
  vite: {
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
});
