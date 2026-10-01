import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import leadsPlugin from './scripts/leadsPlugin.mjs'
import apiDevPlugin from './scripts/apiDevPlugin.mjs'

export default defineConfig({
  plugins: [react(), leadsPlugin(), apiDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  define: {
    global: 'globalThis',
  },
})
