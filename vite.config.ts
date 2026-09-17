import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    rollupOptions: {
      input: {
        setup: fileURLToPath(new URL('./index.html', import.meta.url)),
        opponent: fileURLToPath(new URL('./opponent/index.html', import.meta.url)),
      },
    },
  },
});
