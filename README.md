# WorkBuddy · 猎头工作台

一款**单文件 SPA** 猎头工作台，用于快速筛选简历、构建候选人画像，并在多设备、多成员之间云端协同。

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

## 技术栈

- **前端**：单文件 SPA（`index.html` 内嵌 Vue3 IIFE，~2.3 万行）+ `src/` 下挂载 `window` 的 IIFE 模块（经典 `<script>` 引入，非打包）
- **云端后端**：Supabase（PostgreSQL + Storage + Row Level Security）
  - `workspace_state`：业务整包 JSON（乐观锁 RPC `save_workspace_state`）
  - `resume_texts`：简历文本独立表（Phase 1）
  - `candidates`：候选人业务字段和简历版本元数据（Phase 2a/2b）
  - `resume_versions`：简历版本元数据独立表（Phase 2c，兼容双写，暂不切读）
  - `profiles` / `private_settings`：成员与私有配置
  - Storage bucket `workbuddy-files`：路径 `workspace/main/resumes/{candidateId}/{versionId}/{fileId}`
- **AI 解析**：DeepSeek API（简历文本解析，Key 暂存前端，后续迁入 Edge Function）
- **PDF 处理**：pdf.js + OCR
- **构建/部署**：Tailwind CSS + `scripts/build.js`（纯拷贝到 `dist/`）；GitHub Actions 自动测试 → 构建 → GitHub Pages 发布

## 目录结构

```
.
├── index.html                 # 应用源码（单文件入口）
├── src/
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

1. 浏览器打开线上地址即可，**无需本地安装**（见下方部署）。
2. 首次使用在设置页配置 **DeepSeek API Key**。
3. **管理员（admin）** 登录后，设置页点击「简历文本云端迁移」执行一次性历史回填（失败可重复执行）。

### Phase 2c 简历版本双写（SQL 可统一执行）

1. 后续统一迁移时，在 [Supabase SQL Editor](https://supabase.com/dashboard/project/pskqpgzwifdozaxprpik/sql/new) 执行 `supabase/candidates.sql`、`supabase/resume-texts.sql` 和 `supabase/resume-versions.sql`。
2. 应用设置页点击「开始迁移」完成简历版本元数据回填，再点击「校验一致性」。
3. 当前代码只做版本元数据双写和严格对账，仍以 `workspace_state` / `candidates` 兼容读路径为准；未执行 SQL 或校验未通过时不会切换读取来源。
4. `resume_versions` 不保存 `rawText`、`formattedText` 或 base64 原件；这些内容分别继续由 `resume_texts` 与 Storage/IndexedDB 负责。

### Phase 2b.2 候选人云端读取启用顺序

1. 在 [Supabase SQL Editor](https://supabase.com/dashboard/project/pskqpgzwifdozaxprpik/sql/new) 执行 `supabase/candidates.sql`；已建过早期表也必须再次执行，以补齐 `extra` 兼容列。
2. 在应用设置页运行「候选人云端迁移」，确认失败数为 0。
3. 点击「校验一致性」。系统会逐条核对 ID、业务字段指纹和删除标记，仅数量相同不会放行。
4. 显示「严格一致」后点击「启用云端读取」。此后候选人以 `candidates` 表为权威读取源，`workspace_state` 暂时保留回退副本。

> 未完成上述四步时，应用继续使用原有 `workspace_state` 候选人读路径，不会自动切换。

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
| Phase 2a | candidates 独立表 + 双写 + 历史回填 | ✅ 代码完成 |
| Phase 2b.1 | 候选人增量拉取与对账预览 | ✅ 代码完成 |
| Phase 2b.2 | 严格一致性闸门 + candidates 权威读路径 + workspace_state 回退 | 🟡 代码完成，待生产启用 |
| Phase 2c | resume_versions 独立分表 + 双写 + 迁移/一致性校验 | 🟡 代码完成，待统一执行 SQL；暂不切读 |
| Phase 3 | companies / positions / applications 分表，workspace_state 仅留 UI 配置 | 🟡 表、仓储、双写、严格对账与受闸门保护的读切换完成，默认不启用 |
| Phase 4 | pg_trgm 全文检索 RPC + pgvector 语义匹配 | ⬜ 规划中 |

## 更新日志

- **2026-08-02**：完成 Phase 2c 简历版本元数据仓储、双写、迁移进度和一致性校验；SQL 可与后续阶段统一执行，当前不切换读路径
- **2026-08-02**：开始 Phase 3；完成公司、岗位、推进记录独立表 SQL/RLS 和通用行级仓储，页面仍保持现有 workspace_state 读取
- **2026-08-02**：Phase 3 增加三类实体指纹双写、迁移进度卡片和串行同步，页面仍保持 workspace_state 读取
- **2026-08-02**：Phase 3 增加三类实体严格一致性报告；只有迁移完成且对账通过才允许后续切换读取
- **2026-08-02**：Phase 3 增加受迁移/对账闸门保护的云端权威读取与 workspace_state 回退
- **2026-08-02**：完成 Phase 2b.2 候选人云端读取切换代码；新增完整字段保真、确定性分页、严格一致性闸门和失败回退
- **2026-08-02**：读路径启用后，候选人行写入成为整包同步成功的前置条件，避免 workspace_state 显示成功但 candidates 写入失败
- **2026-07-31**：接入 Supabase 云端后端（`workspace_state` 整包同步 + `resume_texts` 文本分表）
- **2026-07-31**：Phase 0 跨设备原件预览打通；Phase 1 简历文本双写、同步瘦身、新增「简历文本云端迁移」工具
- **2026-07-31**：设置页新增迁移卡片与进度条
- **2026-06-09**：优化 Gist 云同步 `CLEANUP_GRACE` 机制
- **2026-06-09**：增加 fetch 超时逻辑
- **2026-06-09**：修复 `applyRemote` 数据覆盖问题
