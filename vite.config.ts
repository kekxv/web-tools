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
        manualChunks: {
          // 大型库单独分包
          'element-plus': ['element-plus'],
          'prettier': ['prettier'],
          // 其他小型库打一起
          'vendor': ['vue', 'vue-router', 'crypto-js', 'diff', 'highlight.js', 'js-beautify']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom'
  }
})