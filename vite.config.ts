import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [{
    name: 'copy-extension-files',
    closeBundle() {
      copyFileSync('manifest.json', 'dist/manifest.json');
      mkdirSync('dist/icons', { recursive: true });
      for (const size of [16, 32, 48, 128]) copyFileSync(`public/icons/icon-${size}.png`, `dist/icons/icon-${size}.png`);
    }
  }],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(projectRoot, 'src/popup/index.html'),
        options: resolve(projectRoot, 'src/options/index.html'),
        background: resolve(projectRoot, 'src/background/service-worker.ts'),
        content: resolve(projectRoot, 'src/content/capture.ts')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});