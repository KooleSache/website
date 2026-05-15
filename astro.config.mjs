import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import solid from '@astrojs/solid-js';

export default defineConfig({
  site: 'https://colorsnapper.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
  markdown: {
    syntaxHighlight: false,
  },
  integrations: [solid()],
  adapter: netlify(),
});
