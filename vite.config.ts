import { resolve } from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), tailwindcss(), svgr()],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'popup.html'),
        manage: resolve(__dirname, 'manage.html'),
        'service-worker': resolve(__dirname, 'src/background/service-worker.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'service-worker' ? '[name].js' : 'assets/[name]-[hash].js',
        manualChunks(id) {
          if (id.includes('node_modules')) return 'vendor'
          if (id.includes('/src/lib/') || id.includes('/src/shared/') || id.includes('/src/components/')) return 'shared'
        },
      },
    },
  },
})
