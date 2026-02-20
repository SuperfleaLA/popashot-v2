import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  
  // Delegate PostCSS handling to the external postcss.config.js file
  // This prevents 'Dynamic Require' errors in ESM projects
  css: {
    postcss: './postcss.config.js',
  },

  // This setting forces Vite to ignore its cache and re-bundle dependencies
  // useful for resolving persistent 'Dynamic Require' or 'CAC' errors
  optimizeDeps: {
    force: true
  },

  server: {
    port: 3000,
    open: true,
    // Helps with routing and prevents 404s on refresh
    historyApiFallback: true,
    // Essential for Windows users to detect file changes reliably
    watch: {
      usePolling: true,
    }
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      '@': '/src',
    },
  },
})