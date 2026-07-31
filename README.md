# 猎头工作台

一款**单文件 SPA** 猎头工作台，用于快速筛选简历、构建候选人画像，并在多设备、多成员之间云端协同。

## 功能特性

- 📄 **简历快速筛选** —— Swipe 左右滑 + PDF 内联预览
- 👤 **候选人画像库** —— 集成 pdf.js、OCR 与 DeepSeek API 自动解析简历
- 📥 **BOSS 直聘导入** —— 一键抓取候选人投递信息
- ☁️ **Supabase 云端同步** —— 业务数据整包上云，多设备实时一致
- 🔄 **跨设备原件预览** —— 本机缺失时自动从 Supabase Storage 拉取原件（IndexedDB → Storage → 兼容回退）
- 🗂️ **简历文本独立云表** —— `resume_texts` 分表存储，云端同步体积瘦身 90%+，并为全文检索打底
- 👥 **多用户协作** —— `profiles` 角色体系（admin / editor / member），RLS 行级权限隔离
- 🛠️ **一键迁移工具** —— 设置页「简历文本云端迁移」，指纹扫描批量回填历史文本

## 技术栈

- **前端**：单文件 SPA（`index.html` 内嵌 Vue3 IIFE，~2.3 万行）+ `src/` 下挂载 `window` 的 IIFE 模块（经典 `<script>` 引入，非打包）
- **云端后端**：Supabase（PostgreSQL + Storage + Row Level Security）
  - `workspace_state`：业务整包 JSON（乐观锁 RPC `save_workspace_state`）
  - `resume_texts`：简历文本独立表（Phase 1）
  - `profiles` / `private_settings`：成员与私有配置
  - Storage bucket `workbuddy-files`：路径 `workspace/main/resumes/{candidateId}/{versionId}/{fileId}`
- **AI 解析**：DeepSeek API（简历文本解析，Key 暂存前端，后续迁入 Edge Function）
- **PDF 处理**：pdf.js + OCR
- **构建/部署**：Tailwind CSS + `scripts/build.js`（纯拷贝到 `dist/`）；GitHub Actions 自动测试 → 构建 → GitHub Pages 发布

## 目录结构

.
├── index.html # 应用源码（单文件入口）
├── src/
│ └── services/
│ ├── repo/resume-text-repo.js # resume_texts 表读写模块
│ └── resume-file-sync.js # 跨设备原件拉取
├── supabase/
│ └── resume-texts.sql # resume_texts 建表 + RLS + pg_trgm 索引
├── scripts/build.js # 构建脚本
├── .github/workflows/ # 部署流水线
└── README.md


## 使用方法

1. 浏览器打开线上地址即可，**无需本地安装**（见下方部署）。
2. 首次使用在设置页配置 **DeepSeek API Key**。
3. **管理员（admin）** 登录后，设置页点击「简历文本云端迁移」执行一次性历史回填（失败可重复执行）。

## 部署

- **生产环境（GitHub Pages）**：https://chenyuhuan555.github.io/workbuddy-spa-site/
- 提交 `main` 分支 → GitHub Actions 自动 `test` + `build` + 发布 Pages。
- `dist/` 已被 gitignore，构建产物由 CI 生成，无需手动提交。
- （CloudStudio 曾作为预览环境，现以 GitHub Pages 为准。）

> 说明：本机 `git push` 到 GitHub 直连受网络限制，部署通常通过 GitHub 网页端提交触发 Actions。

## 云端架构演进路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 跨设备原件预览链路修复 | ✅ 已完成 |
| Phase 1 | 简历文本分表 + 双写 + 同步瘦身 + 迁移工具 | ✅ 已完成 |
| Phase 2 | candidates / resume_versions 分表 + 行级增量同步 | ⬜ 规划中 |
| Phase 3 | companies / positions / applications 分表，workspace_state 仅留 UI 配置 | ⬜ 规划中 |
| Phase 4 | pg_trgm 全文检索 RPC + pgvector 语义匹配 | ⬜ 规划中 |

## 更新日志

- **2026-07-31**：接入 Supabase 云端后端（`workspace_state` 整包同步 + `resume_texts` 文本分表）
- **2026-07-31**：Phase 0 跨设备原件预览打通；Phase 1 简历文本双写、同步瘦身、新增「简历文本云端迁移」工具
- **2026-07-31**：设置页新增迁移卡片与进度条
- **2026-06-09**：优化 Gist 云同步 `CLEANUP_GRACE` 机制
- **2026-06-09**：增加 fetch 超时逻辑
- **2026-06-09**：修复 `applyRemote` 数据覆盖问题
