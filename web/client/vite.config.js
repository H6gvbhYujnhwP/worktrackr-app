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
      { find: '@app', replacement: path.resolve(__dirname, 'src') },

    ],
  },
  // Inject Stripe price IDs from Render environment variables at build time
  define: {
    'import.meta.env.VITE_PRICE_STARTER_BASE': JSON.stringify(process.env.VITE_PRICE_STARTER_BASE),
    'import.meta.env.VITE_PRICE_PRO_BASE': JSON.stringify(process.env.VITE_PRICE_PRO_BASE),
    'import.meta.env.VITE_PRICE_ENTERPRISE_BASE': JSON.stringify(process.env.VITE_PRICE_ENTERPRISE_BASE),
    'import.meta.env.VITE_PRICE_INDIVIDUAL_BASE': JSON.stringify(process.env.VITE_PRICE_INDIVIDUAL_BASE),
  },
})
