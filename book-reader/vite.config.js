import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/phoenix-project/',
  build: {
    outDir: 'dist',
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: '../burmese/*.md',
          dest: 'content',
          flatten: true
        }
      ]
    })
  ]
});
