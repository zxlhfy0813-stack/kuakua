import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  define: {
    'process.env.MIAODA_BUILD_TARGET': JSON.stringify('standalone'),
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@client/src': path.resolve(__dirname, './src'),
      '@shared': path.resolve(__dirname, './shared'),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
})
