# AI猎头工作台 · AI Recruiter Workspace

一款**单文件 SPA** AI猎头工作台，用于快速筛选简历、构建候选人画像，并在多设备、多成员之间云端协同。

## 功能特性

- 📄 **简历快速筛选** —— Swipe 左右滑 + PDF 内联预览
- 👤 **候选人画像库** —— 集成 pdf.js、OCR 与 DeepSeek API 自动解析简历
- 📥 **BOSS 直聘导入** —— 一键抓取候选人投递信息
- ☁️ **Supabase 云端同步** —— 业务数据整包上云，多设备实时一致
- 🔄 **跨设备原件预览** —— 本机缺失时自动从 Supabase Storage 拉取原件（IndexedDB → Storage → 兼容回退）
- 🗂️ **简历文本独立云表** —— `resume_texts` 分表存储，云端同步体积瘦身 90%+，并为全文检索打底
- 🧾 **简历版本独立元数据表** —— `resume_versions` 双写版本状态与文件索引；原文/排版文本仍由 `resume_texts` 保存
- 👤 **候选人独立云表** —— `candidates` 按人存储；严格一致性校验通过后可切换为候选人权威读取源
- 👥 **多用户协作** —— `profiles` 角色体系（admin / editor / member），RLS 行级权限隔离
- 🛠️ **一键迁移工具** —— 设置页「简历文本云端迁移」，指纹扫描批量回填历史文本
- 🚦 **候选人推进中心** —— 管理人才与岗位的阶段、匹配度、备注、沟通记录和推进时间线
- 👤 **推进负责人分配** —— 推进详情支持输入、重新分配和清空；新建推进按岗位负责人 → 公司负责人 → 候选人负责人自动继承
- 🧹 **失效关联自动隐藏** —— 公司、岗位或候选人已删除时，不在前端展示失效推进记录，同时保留原始业务历史
- 🧪 **游客演示模式** —— 未登录可直接体验虚构数据并新增、修改、删除；改动仅长期保存在当前浏览器，可随时重置
- 🔒 **真实数据完全隔离** —— 游客不读取或写入业务云表，AI 功能使用预设虚构结果，不调用真实 AI 服务

## 技术栈

- **前端**：单文件 SPA（`index.html` 内嵌 Vue3 IIFE，~2.3 万行）+ `src/` 下挂载 `window` 的 IIFE 模块（经典 `<script>` 引入，非打包）
- **云端后端**：Supabase（PostgreSQL + Storage + Row Level Security）
  - `workspace_state`：业务整包 JSON（乐观锁 RPC `save_workspace_state`）
  - `resume_texts`：简历文本独立表（Phase 1）
  - `candidates`：候选人业务字段和简历版本元数据（Phase 2a/2b）
  - `resume_versions`：简历版本元数据独立表（Phase 2c，兼容双写；通过回填和一致性校验后可切换读取）
  - `profiles` / `private_settings`：成员与私有配置
  - Storage bucket `workbuddy-files`：路径 `workspace/main/resumes/{candidateId}/{versionId}/{fileId}`
- **AI 解析**：登录用户使用 DeepSeek API（Key 暂存前端，后续迁入 Edge Function）；游客使用本地预设模拟结果
- **PDF 处理**：pdf.js + OCR
- **构建/部署**：Tailwind CSS + `scripts/build.js`（纯拷贝到 `dist/`）；GitHub Actions 自动测试 → 构建 → GitHub Pages 发布

## 目录结构

```
.
├── index.html                 # 应用源码（单文件入口）
├── src/
│   ├── guest-demo.js                     # 游客虚构数据、本地持久化与重置
│   ├── guest-demo-ai.js                  # 游客本地模拟 AI，不发出真实 AI 请求
│   └── services/
│       ├── repo/resume-text-repo.js      # resume_texts 表读写模块
│       ├── repo/candidate-repo.js        # candidates 行级读写与分页
│       ├── repo/candidate-read-path.js   # 严格校验和权威读路径策略
│       ├── repo/resume-version-repo.js   # resume_versions 元数据读写与分页
│       ├── repo/workbench-entity-repo.js # companies/positions/applications 行级仓储
│       ├── repo/workbench-entity-read-path.js # 三类实体严格对账闸门
│       └── resume-file-sync.js           # 跨设备原件拉取
├── supabase/
│   ├── resume-texts.sql       # resume_texts 建表 + RLS
│   ├── candidates.sql         # candidates 建表/兼容升级 + RLS + 索引
│   ├── resume-versions.sql    # resume_versions 建表/兼容升级 + RLS + 索引
│   └── workbench-entities.sql # companies/positions/applications 建表 + RLS + 索引
├── scripts/build.js           # 构建脚本
├── .github/workflows/         # 部署流水线
└── README.md
```

## 使用方法

1. 浏览器打开线上地址后，未登录用户直接进入带明确标识的游客演示模式，**无需本地安装**。
2. 游客可以新增、修改和删除虚构数据；修改只保存在当前浏览器，不会同步到云端。点击右上角「重置演示数据」可恢复初始内容。
3. 点击右上角「登录查看真实数据」并登录后，才会读取真实业务数据；首次使用可在设置页配置 **DeepSeek API Key**。
4. **管理员（admin）** 登录后，设置页点击「简历文本云端迁移」执行一次性历史回填（失败可重复执行）。
5. 在「推进中心」打开任意推进记录，可编辑「推进负责人」并点击「保存推进记录」；已有负责人不会被新建规则覆盖。


## 部署

- **生产环境（GitHub Pages）**：https://chenyuhuan555.github.io/workbuddy-spa-site/
- 提交 `main` 分支 → GitHub Actions 自动 `test` + `build` + 发布 Pages；当前线上地址以该流水线产物为准。
- `dist/` 已被 gitignore，构建产物由 CI 生成，无需手动提交。
- （CloudStudio 曾作为预览环境，现以 GitHub Pages 为准。）

## 云端架构演进路线

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 0 | 跨设备原件预览链路修复 | ✅ 已完成 |
| Phase 1 | 简历文本分表 + 双写 + 同步瘦身 + 迁移工具 | ✅ 已完成 |
| Phase 2a | candidates 独立表 + 双写 + 历史回填 | ✅ 代码完成 |
| Phase 2b.1 | 候选人增量拉取与对账预览 | ✅ 代码完成 |
| Phase 2b.2 | 严格一致性闸门 + candidates 权威读路径 + workspace_state 回退 | ✅ 代码、迁移、严格校验和切换流程完成；生产启用状态以设置页为准 |
| Phase 2c | resume_versions 独立分表 + 双写 + 迁移/一致性校验 | ✅ 代码、迁移、校验和切换流程完成；生产启用状态以设置页为准 |
| Phase 3 | companies / positions / applications 分表，workspace_state 仅留 UI 配置 | ✅ 表、仓储、双写、严格对账、受闸门保护的读切换和增量冲突处理完成；生产启用状态以设置页为准 |
| Phase 4 | pg_trgm 全文检索 RPC + pgvector 语义匹配 | ⏸️ 暂缓部署：基础 RPC 已准备，但 Supabase Compute/CPU 接近满载；pgvector 语义匹配待补齐 |

> 状态说明：Phase 2b.2、Phase 2c 和 Phase 3 的代码及安全启用流程已经完成，但是否已在当前 Supabase 项目切换为权威读路径，必须以应用设置页显示的“已启用”状态为准。Phase 4 基础 RPC 已具备部署脚本，但因当前 Supabase Compute/CPU 接近满载，暂不执行部署；后续仍需部署 RPC，并补齐真正的 pgvector 语义匹配。

## 更新日志

- **2026-08-05**：新增游客演示模式；虚构数据可在浏览器本地长期编辑和重置，真实业务云数据完全隔离，AI 操作使用本地预设模拟结果

- **2026-08-04**：根据 Supabase 基础设施监控结果暂缓 Phase 4 部署；当前 Compute/CPU 约 98%，先处理资源负载，再上线基础搜索 RPC

- **2026-08-04**：推进中心新增推进负责人编辑、清空和自动继承规则；隐藏公司、岗位或候选人已删除的失效推进记录

- **2026-08-02**：完成 Phase 2c 简历版本元数据仓储、双写、迁移进度和一致性校验；SQL 可与后续阶段统一执行，当前不切换读路径
- **2026-08-02**：开始 Phase 3；完成公司、岗位、推进记录独立表 SQL/RLS 和通用行级仓储，页面仍保持现有 workspace_state 读取
- **2026-08-02**：Phase 3 增加三类实体指纹双写、迁移进度卡片和串行同步，页面仍保持 workspace_state 读取
- **2026-08-02**：Phase 3 增加三类实体严格一致性报告；只有迁移完成且对账通过才允许后续切换读取
- **2026-08-02**：Phase 3 增加受迁移/对账闸门保护的云端权威读取与 workspace_state 回退
- **2026-08-02**：Phase 3 增加增量拉取的按时间戳合并与冲突报告；本地较新记录不会被旧云端数据覆盖，并在设置页明确提示
- **2026-08-02**：Phase 3 增加 30 秒后台增量轮询和可持久化离线写队列；断网时业务实体进入 localStorage 重试队列，恢复联网后按序回放
- **2026-08-02**：Phase 2a candidates 双写接入同一离线队列，候选人记录断网时可持久化排队，恢复联网后按指纹增量回放
- **2026-08-02**：Phase 2b candidates 读路径增加 30 秒后台增量拉取，并在轮询时自动回放候选人离线写队列
- **2026-08-02**：完成代码基础收口：workspace_state UI-only 瘦身闸门、Phase 4 搜索/匹配 Repository 与 RPC 契约、AI Edge Function 网关骨架；默认保持回退，待 SQL 和函数部署
- **2026-08-02**：完成 Phase 2b.2 候选人云端读取切换代码；新增完整字段保真、确定性分页、严格一致性闸门和失败回退
- **2026-08-02**：读路径启用后，候选人行写入成为整包同步成功的前置条件，避免 workspace_state 显示成功但 candidates 写入失败
- **2026-07-31**：接入 Supabase 云端后端（`workspace_state` 整包同步 + `resume_texts` 文本分表）
- **2026-07-31**：Phase 0 跨设备原件预览打通；Phase 1 简历文本双写、同步瘦身、新增「简历文本云端迁移」工具
- **2026-07-31**：设置页新增迁移卡片与进度条
- **2026-06-09**：优化 Gist 云同步 `CLEANUP_GRACE` 机制
- **2026-06-09**：增加 fetch 超时逻辑
- **2026-06-09**：修复 `applyRemote` 数据覆盖问题
