# Tailwind 生产构建、依赖清单与 CSP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用固定版本的构建期 Tailwind 静态 CSS 替换 Play CDN，记录第三方依赖和许可证，并为当前 GitHub Pages 架构增加不会破坏既有功能的基础 CSP。

**Architecture:** 保留现有复制式 `scripts/build.js`，但在复制前同步运行 Tailwind CLI生成 `public/assets/workbuddy.css`。通过产物测试阻止 CDN/运行时编译器回归；CSP 先适配 Vue 运行时模板编译，严格策略留待 P1-1 完成。

**Tech Stack:** Tailwind CSS 3.4.17 CLI、Node build script、GitHub Actions/Pages、HTML CSP meta、Node `node:test`。

---

### Task 1: 建立 Tailwind 构建输入和产物测试

**Files:**
- Create: `tailwind.config.cjs`
- Create: `src/styles/tailwind-input.css`
- Create: `src/production-build.test.mjs`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] **Step 1: 固定 Tailwind 版本**

Run: `npm install --save-dev --save-exact tailwindcss@3.4.17`

Expected: `package.json` 出现 `"tailwindcss": "3.4.17"`，lockfile 固定完整依赖树。

- [ ] **Step 2: 写配置和 CSS 输入**

```js
// tailwind.config.cjs
module.exports = {
  content: ['./index.html', './src/**/*.{js,mjs,html}'],
  safelist: [],
  theme: { extend: {} },
  plugins: [],
};
```

```css
/* src/styles/tailwind-input.css */
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 3: 写失败的生产构建测试**

测试执行 `npm run build` 后断言：`dist/assets/workbuddy.css` 存在且大于 10KB；`dist/index.html` 不含 `cdn.tailwindcss.com` 和 `tailwindcss.min.js`；CSS 包含 `.hidden`、`.grid`、`.bg-emerald-700`、响应式 `sm:` 和任意值类的转义选择器。

- [ ] **Step 4: 验证失败**

Run: `node --test src/production-build.test.mjs`

Expected: FAIL，当前构建没有静态 CSS 且仍引用 Play CDN。

- [ ] **Step 5: 保持红灯测试未提交**

在静态 CSS 构建完成前不把该测试加入 `npm test`，也不提交已知失败的测试；继续进入 Task 2。

### Task 2: 迁移到构建期静态 CSS

**Files:**
- Modify: `scripts/build.js`
- Modify: `index.html:7`
- Delete: `public/lib/tailwindcss.min.js`
- Modify: `package.json`

- [ ] **Step 1: 增加构建命令**

```json
"build:css": "tailwindcss -c tailwind.config.cjs -i ./src/styles/tailwind-input.css -o ./public/assets/workbuddy.css --minify",
"build": "npm run build:css && node scripts/build.js"
```

`scripts/build.js` 保持只负责验证输入和复制，不重复调用 npm 形成递归。复制前检查 `public/assets/workbuddy.css` 存在且非空，否则抛错终止。

- [ ] **Step 2: 替换页面引用**

删除：

```html
<script src="https://cdn.tailwindcss.com"></script>
```

增加：

```html
<link rel="stylesheet" href="./assets/workbuddy.css">
```

- [ ] **Step 3: 审计动态类名**

Run: `rg -n "class.*\$\{|:class=.*\+|:class=.*`" index.html src`

把无法被静态扫描发现且浏览器实际使用的完整类名加入 `safelist`。不得使用 `/bg-.*/`、`/text-.*/` 等宽泛模式。

- [ ] **Step 4: 删除浏览器运行时编译器并验证**

删除 `public/lib/tailwindcss.min.js`，将 `src/production-build.test.mjs` 加入 `npm test`。Run: `npm run build`，然后 `npm test`。

Expected: 全部 PASS；`dist/assets/workbuddy.css` 生成；构建产物无 Tailwind CDN/运行时 JS。

- [ ] **Step 5: 视觉回归并提交**

在 320、768、1024、1440 像素验证登录页、公司列表、人才列表、推进表格/看板、弹窗和设置页。控制台不得出现未知 Tailwind 类或布局突变。

```powershell
git add scripts/build.js index.html package.json package-lock.json tailwind.config.cjs src/styles/tailwind-input.css src/production-build.test.mjs public/assets/workbuddy.css
git add -u public/lib/tailwindcss.min.js
git commit -m "build: compile Tailwind CSS for production"
```

### Task 3: 依赖和许可证清单

**Files:**
- Create: `docs/dependencies.md`
- Create: `THIRD_PARTY_NOTICES.md`
- Modify: `src/production-build.test.mjs`

- [ ] **Step 1: 写清单存在性测试**

断言两个文件存在且列出 Vue、Supabase JS、Tailwind、Vite、parse5、PDF.js、JSZip、SheetJS、jsQR、Tesseract.js、ECharts、Mermaid；每项必须包含用途、版本/文件、来源和许可证字段。

- [ ] **Step 2: 生成实际依赖清单**

`docs/dependencies.md` 分为 npm 构建依赖、浏览器 vendored 依赖、外部 API 三节；版本从 `package-lock.json` 和本地库头部读取，不猜测。API 项明确不属于打包依赖。

- [ ] **Step 3: 写第三方通知**

`THIRD_PARTY_NOTICES.md` 对每个分发库记录名称、版本、项目主页、许可证 SPDX 标识和本地许可证文件/上游许可证链接。若本地压缩文件无法确认版本，标为“版本未嵌入文件，发布前需从来源清单锁定”，同时生产构建测试应因此失败，直到版本被确认并记录；不能写推测版本。

- [ ] **Step 4: 审计和验证**

Run: `npm audit --audit-level=high`

Run: `npm test`

Expected: 无 high/critical 可达漏洞；清单测试 PASS。若仅开发期出现告警，在 `docs/dependencies.md` 写明包、严重度、不可达依据和复核日期。

- [ ] **Step 5: 提交**

```powershell
git add docs/dependencies.md THIRD_PARTY_NOTICES.md src/production-build.test.mjs
git commit -m "docs: record production dependencies and licenses"
```

### Task 4: 增加适配当前架构的基础 CSP

**Files:**
- Modify: `index.html:3-15,10115-10130`
- Modify: `src/production-build.test.mjs`

- [ ] **Step 1: 写失败的 CSP 测试**

解析 CSP meta 并断言包含 `default-src 'self'`、`object-src 'none'`、`base-uri 'self'`、`form-action 'self'`；`script-src` 不含 Tailwind CDN/jsDelivr/unpkg；`connect-src` 不允许裸 `https:` 或 `*`，并包含当前 Supabase、DeepSeek、rss2json、allorigins、raw.githubusercontent 域名。

- [ ] **Step 2: 删除 Vue 外部脚本回退**

`ensureVueDependency` 只接受本地 `./lib/vue.global.prod.js`；本地脚本缺失时显示明确初始化错误，不再从 jsDelivr/unpkg 动态加载。

- [ ] **Step 3: 添加基础 CSP meta**

```html
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; base-uri 'self'; object-src 'none'; form-action 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; font-src 'self' data:; img-src 'self' data: blob: https:; connect-src 'self' blob: https://pskqpgzwifdozaxprpik.supabase.co wss://pskqpgzwifdozaxprpik.supabase.co https://api.deepseek.com https://api.rss2json.com https://api.allorigins.win https://raw.githubusercontent.com; worker-src 'self' blob:; frame-src 'self' blob:;">
```

`img-src https:` 是为 RSS 和用户简历中的任意 HTTPS 图片保留的显式内容例外；脚本和网络请求域名仍严格限制。`unsafe-inline` / `unsafe-eval` 必须在文档中注明由当前 Vue 运行时模板编译和内联样式造成，P1-1 预编译后删除。

- [ ] **Step 4: 自动化和浏览器验证**

Run: `npm run build && npm test`

Expected: 全部 PASS。用生产预览验证登录、Supabase 读写、DeepSeek、RSS、PDF worker、图表和简历预览；控制台无 CSP 拒绝。只允许为已验证的真实功能增加精确域名，不允许回退到 `connect-src https:`。

- [ ] **Step 5: 提交**

```powershell
git add index.html src/production-build.test.mjs docs/dependencies.md
git commit -m "security: add baseline content security policy"
```

### Task 5: 最终发布前验证

**Files:**
- Modify only if a test exposes a defect in files owned by Tasks 1-4.

- [ ] **Step 1: 全套自动化**

Run: `npm ci`

Run: `npm audit --audit-level=high`

Run: `npm test`

Run: `npm run build`

Expected: 所有命令退出码 0。

- [ ] **Step 2: 产物检查**

确认 `dist/index.html` 只引用本地脚本/CSS；`dist/lib/tailwindcss.min.js` 不存在；测试文件未进入 `dist/src`；依赖和许可证文档进入产物的行为与现有 `scripts/build.js` 一致。

- [ ] **Step 3: 浏览器回归**

使用 `dist/` 预览完成四个宽度、键盘导航、分页、保存状态、外部 API 与控制台检查。记录任何 CSP 例外及原因。

- [ ] **Step 4: 最终提交（仅存在验证修复时）**

先运行 `git diff --name-only`，只逐个暂存由本计划验证失败直接产生的修复文件；如果没有修复则不创建空提交。暂存后运行 `git diff --cached --check` 和 `git diff --cached --stat`，再执行：

```powershell
git commit -m "fix: resolve production verification regressions"
```
