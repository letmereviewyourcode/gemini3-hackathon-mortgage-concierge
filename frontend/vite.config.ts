import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8100,
    proxy: {
      // Proxy API requests to Broker
      '/gemini-proxy': {
        target: 'http://localhost:4020',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gemini-proxy/, ''),
      },
      // Proxy Unsplash images to avoid CORS
      '/image-proxy': {
        target: 'http://localhost:4020/proxy-image',
        changeOrigin: true,
        rewrite: (path) => `?url=${encodeURIComponent(path.replace(/^\/image-proxy/, 'https://images.unsplash.com'))}`,
      }
    }
  }
});
