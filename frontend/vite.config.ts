import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8100,
    strictPort: true,
    proxy: {
      '/gemini-proxy': {
        target: 'http://localhost:4025',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/gemini-proxy/, ''),
      },
      // Image proxy to bypass CORS for sample images from Unsplash
      '/image-proxy': {
        target: 'https://images.unsplash.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/image-proxy/, ''),
        secure: true,
      },
    },
  },
  preview: {
    port: 8100,
  },
})
