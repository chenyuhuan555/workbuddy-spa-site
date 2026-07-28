import { defineConfig } from 'vite';

export default defineConfig({
  // GitHub Pages 部署路径
  base: '/workbuddy-spa-site/',

  build: {
    outDir: 'dist',
    // 保留内联脚本不被提取（兼容现有 IIFE 全局通信模式）
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        // 保持经典脚本的原始文件名，不加 hash（便于调试）
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
  },

  server: {
    port: 5173,
    open: false,
  },
});
