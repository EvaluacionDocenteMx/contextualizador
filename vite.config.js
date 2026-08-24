import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  define: { __NIVEL__: JSON.stringify(process.env.VITE_NIVEL || 'primaria') },
  server: { proxy: { '/api': 'http://localhost:8888' } },
})
