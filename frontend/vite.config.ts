import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react-swc'
import path from 'path'
import { loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Vite does not automatically expose `.env` values on `process.env` inside config.
  // Load env here so settings like VITE_PROXY_TARGET work reliably in dev.
  const env = loadEnv(mode, __dirname, '')
  const proxyTarget = env.VITE_PROXY_TARGET || 'http://localhost:3000'

  return {
    plugins: [react()],
    // base path for deployed assets — '/' works for root deployment;
    // change to '/subpath/' if deployed under a nested path on Vixxo network.
    base: '/',
    build: {
      outDir: 'dist',
      // No source maps in production to reduce bundle size; use 'hidden' if
      // you need server-side error tracking (e.g., Sentry) without exposing maps.
      sourcemap: false,
      // Target modern browsers per architecture spec
      target: ['chrome107', 'firefox104', 'safari16'],
      // Enable chunk size warnings above 500 KB
      chunkSizeWarningLimit: 500,
      rollupOptions: {
        output: {
          // Split large vendor libraries into separate chunks for better caching
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router'],
            'vendor-ui': ['@chakra-ui/react', '@emotion/react', 'lucide-react'],
            'vendor-query': ['@tanstack/react-query'],
          },
        },
      },
    },
    server: {
      port: 1576,
      strictPort: true, // Fail if port is in use instead of trying another
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './vitest.setup.ts',
      css: true,
    },
  }
})
