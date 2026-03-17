import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks(id) {
          // prettier 单独分包（格式化页面才需要，体积大且无循环依赖）
          if (id.includes('prettier')) {
            return 'prettier'
          }
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})