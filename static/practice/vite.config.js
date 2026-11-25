import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Forge Custom UI serves the build folder from a relative path, so assets must use relative URLs.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: { fs: { allow: ['..', '../..'] } }, build: { outDir: 'build', emptyOutDir: true, sourcemap: false },
  test: { environment: 'jsdom', include: ['test/**/*.test.jsx'], testTimeout: 20000 },
});
