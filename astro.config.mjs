import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://colorsnapper.com',
  trailingSlash: 'always',
  build: {
    format: 'directory',
  },
});
