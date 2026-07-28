/**
 * Phase 1 构建脚本：将现有单文件应用原样复制到 dist/。
 *
 * 为什么不直接用 vite build？
 *   index.html 内嵌 Vue 模板使用了 @click / :class 等 HTML 规范之外的属性语法，
 *   Vite 的 parse5 HTML 解析器会报错。等后续阶段把模板迁移到 .vue SFC 后，
 *   就可以切换到标准 vite build 流水线。
 *
 * 当前策略：
 *   - 复制 index.html、public/（vendor libs）、src/（IIFE 脚本）到 dist/
 *   - 保持相对路径不变（GitHub Pages 以 /workbuddy-spa-site/ 为根）
 *   - 清理 dist/ 中的测试文件和 node_modules
 */
import { cpSync, rmSync, mkdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dist = resolve(root, 'dist');

// 清空 dist
if (existsSync(dist)) rmSync(dist, { recursive: true });
mkdirSync(dist, { recursive: true });

// 1. 入口 HTML
cpSync(resolve(root, 'index.html'), resolve(dist, 'index.html'));

// 2. public/ → dist/（vendor libs 等静态资源）
cpSync(resolve(root, 'public'), dist, { recursive: true });

// 3. src/ → dist/src/（IIFE 脚本，排除测试文件）
cpSync(resolve(root, 'src'), resolve(dist, 'src'), {
  recursive: true,
  filter(src) {
    // 排除测试文件和 node_modules
    if (src.includes('.test.')) return false;
    if (src.includes('node_modules')) return false;
    return true;
  },
});

// 4. docs/（如果存在）
const docsDir = resolve(root, 'docs');
if (existsSync(docsDir)) {
  cpSync(docsDir, resolve(dist, 'docs'), { recursive: true });
}

console.log('✓ 构建完成 → dist/');
