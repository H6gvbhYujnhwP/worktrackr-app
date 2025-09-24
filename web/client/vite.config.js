// web/client/vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      // Manus: "@/..." -> /web/client/src/app/src/...
      { find: /^@\//, replacement: `${path.resolve(__dirname, 'src/app/src')}/` },

      // Your existing app alias (keep as-is)
      { find: '@', replacement: path.resolve(__dirname, 'src') },
    ],
  },
})
