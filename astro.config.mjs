// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

// If you deploy to GitHub Pages under a sub-path, set `site` and `base` here,
// e.g. site: 'https://<user>.github.io', base: '/<repo>'.
export default defineConfig({
  integrations: [react()],
});
