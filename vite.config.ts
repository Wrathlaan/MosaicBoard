
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets in the built app
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true,
  },
})
