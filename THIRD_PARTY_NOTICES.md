# Third-Party Notices

WorkBuddy 分发以下第三方软件。版本来自本仓库实际锁文件或 vendored bundle；许可证链接指向对应上游项目。此文件用于集中披露，不替代各许可证的完整条款。

| 名称 | 版本 | 用途 | 项目主页/来源 | 许可证（SPDX） | 许可证文本 |
| --- | --- | --- | --- | --- | --- |
| Vue | 3.5.39 | SPA 运行时与模板编译 | https://github.com/vuejs/core | MIT | https://github.com/vuejs/core/blob/main/LICENSE |
| Supabase JS | 2.110.2 | Auth、数据库、存储和 Realtime 客户端 | https://github.com/supabase/supabase-js | MIT | https://github.com/supabase/supabase-js/blob/master/LICENSE |
| Tailwind CSS | 3.4.17 | 构建期 CSS 生成 | https://github.com/tailwindlabs/tailwindcss | MIT | https://github.com/tailwindlabs/tailwindcss/blob/v3.4.17/LICENSE |
| Vite | 6.4.3 | 开发脚手架 | https://github.com/vitejs/vite | MIT | https://github.com/vitejs/vite/blob/v6.4.3/LICENSE |
| parse5 | 7.3.0 | HTML 静态审计 | https://github.com/inikulin/parse5 | MIT | https://github.com/inikulin/parse5/blob/v7.3.0/LICENSE |
| PDF.js | 3.11.174 | PDF 解析和 worker | https://github.com/mozilla/pdf.js | Apache-2.0 | https://github.com/mozilla/pdf.js/blob/master/LICENSE |
| JSZip | 3.10.1 | ZIP 归档 | https://github.com/Stuk/jszip | MIT OR GPL-3.0；本项目选择 MIT | https://github.com/Stuk/jszip/blob/v3.10.1/LICENSE.markdown |
| SheetJS Community Edition | 0.18.5 | XLSX 文件生成 | https://git.sheetjs.com/SheetJS/sheetjs | Apache-2.0 | https://git.sheetjs.com/SheetJS/sheetjs/src/tag/v0.18.5/LICENSE |
| jsQR | 1.4.0 | 二维码识别 | https://github.com/cozmo/jsQR | Apache-2.0 | https://github.com/cozmo/jsQR/blob/master/LICENSE |
| Tesseract.js | 5.1.1 | OCR | https://github.com/naptha/tesseract.js | Apache-2.0 | https://github.com/naptha/tesseract.js/blob/v5.1.1/LICENSE.md |
| Apache ECharts | 5.5.0 | 统计与关系图表 | https://github.com/apache/echarts | Apache-2.0 | https://github.com/apache/echarts/blob/5.5.0/LICENSE |
| Mermaid | 10.9.6 | Mermaid 图表渲染 | https://github.com/mermaid-js/mermaid | MIT | https://github.com/mermaid-js/mermaid/blob/v10.9.6/LICENSE |

## Bundle 内已保留的通知

- `public/lib/vue.global.prod.js` 保留 Vue 版本、版权和 MIT 标识。
- `public/lib/echarts.min.js` 保留 Apache Software Foundation 许可证通知。
- `public/lib/pdf.min.js` 与 `public/lib/pdf.worker.min.js` 保留完整 Apache-2.0 许可起始通知。
- `public/lib/jszip.min.js` 保留版本、作者及双许可证说明。
- `public/lib/tesseract.min.js` 指向上游许可证 sidecar；本仓库没有原 sidecar，因此在本文件中提供明确的上游许可证链接。

## 版本可追溯说明

- jsQR 文件与 npm `jsqr@1.4.0/dist/jsQR.js` 仅换行格式不同；归一化 CRLF/LF 后 SHA-256 均为 `bc40c8a15196236b2314db0856f72ca0b49980cd5413b8c852a7349f5fee0859`。
- Supabase JS 版本取自实际 bundle 发出的 `X-Client-Info: supabase-js/2.110.2`，不是根据文件名推测。
- 其余浏览器 bundle 的版本证据见 `docs/dependencies.md`。
