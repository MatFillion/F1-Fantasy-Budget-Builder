import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/F1-Fantasy-Budget-Builder/',
  plugins: [react(), tailwindcss()],
})
