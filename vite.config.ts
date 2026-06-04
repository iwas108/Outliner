import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'app',
  base: '/Outliner/dist/',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  }
})
