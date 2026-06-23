import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site is served from GitHub Pages at thorleypark.com. This app lives at
// /seating, and its production build is written into the repo's top-level
// `seating` directory so it deploys as a static sub-app alongside the others.
export default defineConfig({
  base: '/seating/',
  plugins: [react()],
  build: {
    outDir: '../seating',
    emptyOutDir: true,
  },
})
