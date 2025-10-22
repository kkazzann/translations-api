import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? '/' : '/translations-api/v1/',
  plugins: [react()],
  build: {
    outDir: '../public',
    emptyOutDir: true,
  },
}));
