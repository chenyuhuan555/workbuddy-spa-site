# WorkBuddy 依赖清单

复核日期：2026-07-29。此清单区分构建依赖、随站点分发的浏览器依赖和外部服务。版本优先取自 `package-lock.json` 与 `public/lib` 内实际文件；不以当前上游最新版替代本仓库版本。

## npm 构建与审计依赖

| 名称 | 用途 | 锁定版本 | 来源 | 许可证 |
| --- | --- | --- | --- | --- |
| Tailwind CSS | 扫描模板并在构建期生成 `public/assets/workbuddy.css` | 3.4.17 | `package-lock.json`；[Tailwind CSS](https://github.com/tailwindlabs/tailwindcss) | MIT |
| Vite | 本地开发和后续模块化构建脚手架；当前生产构建仍由 `scripts/build.js` 完成 | 6.4.3 | `package-lock.json`；[Vite](https://github.com/vitejs/vite) | MIT |
| parse5 | 静态解析真实 HTML，审计按钮、label、ARIA 和 CSP | 7.3.0 | `package-lock.json`；[parse5](https://github.com/inikulin/parse5) | MIT |

这些包只在开发/构建阶段运行，不会把 `node_modules` 复制到 `dist/`。Tailwind 生成的 CSS 会随站点分发。

## 随站点分发的浏览器依赖

| 名称 | 用途 | 实际版本/文件 | 版本证据 | 来源 | 许可证 |
| --- | --- | --- | --- | --- | --- |
| Vue | SPA 响应式状态、模板运行时编译和渲染 | 3.5.39；`public/lib/vue.global.prod.js` | 文件头 `vue v3.5.39` | [Vue](https://github.com/vuejs/core) | MIT |
| Supabase JS | 登录、PostgREST、存储和 Realtime 同步 | 2.110.2；`public/lib/supabase.js` | bundle 的 `X-Client-Info` 为 `supabase-js/2.110.2` | [Supabase JS](https://github.com/supabase/supabase-js) | MIT |
| PDF.js | PDF 文本解析与本地 worker | 3.11.174；`pdf.min.js`、`pdf.worker.min.js` | bundle 内版本常量；文件头含 Apache 2.0 通知 | [PDF.js](https://github.com/mozilla/pdf.js) | Apache-2.0 |
| JSZip | 导出 ZIP 归档 | 3.10.1；`public/lib/jszip.min.js` | 文件头 `JSZip v3.10.1` | [JSZip](https://github.com/Stuk/jszip) | MIT OR GPL-3.0；本项目按 MIT 分发 |
| SheetJS | 生成 XLSX 汇总文件 | 0.18.5；`public/lib/xlsx.full.min.js` | bundle 运行时版本 `0.18.5` | [SheetJS CE](https://git.sheetjs.com/SheetJS/sheetjs) | Apache-2.0 |
| jsQR | 识别 BOSS 二维码图片 | 1.4.0；`public/lib/jsQR.min.js` | 与 npm `jsqr@1.4.0/dist/jsQR.js` 归一化换行后的 SHA-256 完全一致 | [jsQR](https://github.com/cozmo/jsQR) | Apache-2.0 |
| Tesseract.js | 中文/英文 OCR | 5.1.1；`public/lib/tesseract.min.js` | bundle 内版本常量 `5.1.1` | [Tesseract.js](https://github.com/naptha/tesseract.js) | Apache-2.0 |
| ECharts | 网络图、漏斗和统计图表 | 5.5.0；`public/lib/echarts.min.js` | bundle 的 `version:"5.5.0"` | [Apache ECharts](https://github.com/apache/echarts) | Apache-2.0 |
| Mermaid | 将 AI 输出中的 Mermaid 文本渲染为 SVG | 10.9.6；`public/lib/mermaid.min.js` | bundle 版本常量 `10.9.6` | [Mermaid](https://github.com/mermaid-js/mermaid) | MIT |

## 外部 API 与内容源

这些是运行期网络服务，不属于打包依赖，也不随站点分发。CSP 仅允许业务代码当前真实使用的连接域名。

| 服务 | 用途 | 端点/来源 | 凭据位置 |
| --- | --- | --- | --- |
| Supabase 项目 | 身份认证、工作区状态、存储和 Realtime | `https://pskqpgzwifdozaxprpik.supabase.co`、同主机 WSS | 公开 URL/anon key 在部署配置；用户会话由 Supabase 管理 |
| DeepSeek | AI 分析、抽取和顾问问答 | `https://api.deepseek.com` | 管理员/高级成员在应用设置中配置 API Key |
| rss2json | RSS 转 JSON | `https://api.rss2json.com` | 可选 API Key |
| AllOrigins | RSS CORS 兼容回退 | `https://api.allorigins.win` | 无 |
| GitHub Raw | 读取公开资讯源清单 | `https://raw.githubusercontent.com` | 无 |

## 安全与后续收紧

- 生产页面只加载仓库内脚本和构建生成的 CSS；Tailwind Play CDN 已退出。
- 当前 Vue 仍使用浏览器运行时模板编译，因此基线 CSP 暂时需要 `script-src 'unsafe-eval'`；待 P1-1 将模板迁移并预编译后移除。
- 页面仍有内联脚本和内联样式，因此当前 CSP 暂时需要 `'unsafe-inline'`；模块拆分后应改用 nonce/hash 或纯外部资源。
- `img-src https:` 是 RSS、公司资料和简历图片的内容例外，不等于允许任意脚本或任意 API 连接。
- Tesseract.js 5.1.1 默认从 `https://cdn.jsdelivr.net` 加载 OCR worker，并从 `https://tessdata.projectnaptha.com` 加载语言模型；基础 CSP 仅在 `worker-src` / `connect-src` 为这两个真实资源添加精确来源。中期应把 worker、WASM core 和 `chi_sim+eng` 模型全部纳入版本化本地资产，再删除这两个网络例外。
