import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { apiDevPlugin } from './vite-plugin-api'

export default defineConfig({
  plugins: [react(), apiDevPlugin()],
})
