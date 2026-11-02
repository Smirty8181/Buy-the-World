import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/Buy-the-World/' : '/',
  plugins: [vue()],
  test: {
    environment: 'node',
  },
})
