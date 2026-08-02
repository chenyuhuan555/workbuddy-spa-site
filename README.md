# WorkBuddy · 猎头工作台

一款单文件 SPA 猎头工作台，用于快速筛选简历、构建候选人画像，并在多设备、多成员之间云端协同。

## 功能特性

- 📄 简历快速筛选 —— Swipe 左右滑 + PDF 内联预览
- 👤 候选人画像库 —— 集成 pdf.js、OCR 与 DeepSeek API 自动解析简历
- 📥 BOSS 直聘导入 —— 一键抓取候选人投递信息
- ☁️ Supabase 云端同步 —— 业务数据整包上云，多设备实时一致
- 🔄 跨设备原件预览 —— 本机缺失时自动从 Supabase Storage 拉取原件
- 🗂️ 简历文本独立云表（resume_texts）—— 云端同步体积瘦身 90%+
- 🗂️ 候选人独立云表（candidates，Phase 2a）—— 候选人元数据以「候选人粒度」同步
- 👥 多用户协作 —— profiles 角色体系（admin/editor/member），RLS 行级权限
- 🛠️ 一键迁移工具 —— 设置页「简历文本云端迁移」「候选人云端迁移」，指纹扫描批量回填
- 🔁 候选人增量同步（Phase 2b 预览）—— 一致性校验 + 从云端拉取增量对账

## 技术栈

- 前端：单文件 SPA（index.html 内嵌 Vue3 IIFE）+ src/ 下 IIFE 模块（经典 script 引入）
- 云端后端：Supabase（PostgreSQL + Storage + RLS）
  - workspace_state：业务整包 JSON（乐观锁 RPC save_workspace_state）
  - resume_texts：简历文本独立表（Phase 1）
  - candidates：候选人独立表（Phase 2a，text 主键 cand_xxx）
  - profiles / private_settings：成员与私有配置
  - Storage bucket workbuddy-files：workspace/main/resumes/{candidateId}/{versionId}/{fileId}
- AI 解析：DeepSeek API
- PDF 处理：pdf.js + OCR
- 构建/部署：Tailwind + scripts/build.js；GitHub Actions 自动 test → build → Pages 发布

## 云端架构演进路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 跨设备原件预览链路修复 | ✅ 已完成 |
| Phase 1 | 简历文本分表 + 双写 + 瘦身 + 迁移工具 | ✅ 已完成 |
| Phase 2a | candidates 分表 + 双写 + 回填 | ✅ 已完成（一致性校验漂移 = 0）|
| Phase 2b.1 | 增量拉取对账 + 一致性校验器 | ✅ 已完成 |
| Phase 2b.2 | 切读路径（workspace_state 剥离 candidates，渲染改读 candidates 表）| 🔜 进行中 |
| Phase 2c | resume_versions 独立表 + 行级增量同步 | ⬜ 规划中 |
| Phase 3 | companies / positions / applications 分表 | ⬜ 规划中 |
| Phase 4 | pg_trgm 全文检索 RPC + pgvector 语义匹配 | ⬜ 规划中 |

## 更新日志

- **2026-08-02**：Phase 2a 上线并跑完候选人回填，一致性校验漂移 = 0
- **2026-08-02**：Phase 2b.1 增量拉取对账 + 一致性校验器上线
- **2026-07-31**：接入 Supabase 云端后端（workspace_state 整包 + resume_texts 分表）
- **2026-07-31**：Phase 0 跨设备原件预览打通；Phase 1 文本双写/瘦身/迁移工具
- **2026-06-09**：优化 Gist 云同步 CLEANUP_GRACE 机制 / fetch 超时 / applyRemote 覆盖修复
