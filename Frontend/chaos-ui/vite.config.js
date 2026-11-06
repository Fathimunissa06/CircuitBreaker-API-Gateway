import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The proxy sends these paths to the API Gateway, so the browser never hits CORS problems
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:8080',
      '/chaos': 'http://localhost:8080',
      '/gateway': 'http://localhost:8080',
    },
  },
})