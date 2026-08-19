#AI 猎头工作台

WorkBuddy 是面向猎头团队的人才寻访、候选人入库、岗位匹配和推进管理工作台。当前以量子计算领域为试点，通过“公司维度”的渠道漏斗，回答三个问题：哪个渠道带来的候选人最多、哪个渠道转化最好、哪个阶段存在卡点以及应该如何优化。

线上地址：<https://chenyuhuan555.github.io/workbuddy-spa-site/>

## 当前核心流程

```text
选择合作公司
  → 查看该公司的渠道漏斗
  → 点击外宣网站 / 小蜜蜂 / 倍罗 / 传统猎头等渠道
  → 上传渠道 Excel，按行预览并由 AI 整理候选人信息
  → 候选人进入人才库，并记录首次来源与所属公司
  → 后续再进行岗位匹配和候选人推进
```

### 公司渠道漏斗

- 首页直接展示一家公司的漏斗，可通过公司下拉框切换。
- 不同公司的数据完全分开，不合并成一个总漏斗。
- 所有启用渠道都会展示，没有数据时显示 `0`。
- 漏斗包含：入库数量、触达、人才匹配成功、约面、Offer、入职。
- 系统按固定规则生成渠道统计、转化率、卡点和结论。
- AI 只负责解释统计事实并补充优化建议，不修改原始统计结果。

### 候选人渠道导入

首页点击渠道卡片后，会打开批量简历导入弹窗，并自动带入：

- 当前合作公司
- 当前首次来源渠道
- AI 简历解析上下文

Excel 候选人批量导入支持从带有“姓名、当前职位、当前公司、城市、学历、公开联系方式”等列的表格中自动识别候选人。每一行对应一名候选人，导入前会展示可编辑预览，并按邮箱、电话和姓名 + 公司进行查重；重复或缺少姓名的记录不会自动入库。已配置 DeepSeek 时，系统会先按当前渠道整理字段，AI 不可用时保留本地字段解析结果。

候选人先进入人才库，不要求导入时选择岗位。后续在人才库中进行岗位匹配，并单独创建推进记录。

首次来源示例：

| 渠道 | 说明 |
| --- | --- |
| 外宣网站 | 分享量子计算外宣网站后，候选人主动投递 |
| 小蜜蜂 | 从论文网站等外部信息源搜寻联系方式并入库 |
| 倍罗 | 使用 AI 搜索简历工具寻找匹配候选人 |
| 传统猎头 | 通过已认识的量子计算人才进行推荐 |

渠道名称可以在渠道管理中修改，也支持新增一级渠道。候选人只记录首次来源，避免重复触达导致统计口径漂移。

## 功能模块

- **公司与岗位**：维护合作公司、公司介绍、岗位信息；支持 AI 批量解析 CSV / Excel / 文本岗位。
- **人才库**：批量上传 PDF、Word、图片或文本简历；支持查重、合并、新版本和 AI 信息整理。
- **岗位匹配**：从人才库筛选候选人，再创建候选人与岗位之间的推进记录。
- **推进中心**：管理推荐、面试、Offer、入职等阶段和负责人。
- **渠道漏斗**：按公司和首次来源统计人才来源及阶段转化。
- **卡点诊断**：展示失败掉点、原因码、掉点阶段和覆盖范围。
- **AI 建议**：基于当前公司的统计事实生成解释和优化方向。
- **游客演示模式**：未登录时使用虚构数据，数据只保存在当前浏览器，不访问真实业务数据。

## 快速开始

```powershell
npm install
npm run dev
```

开发服务器启动后打开终端显示的本地地址。生产构建：

```powershell
npm test
npm run build
npm run preview
```

## 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run dev` | 启动本地开发服务器 |
| `npm test` | 执行完整回归测试 |
| `npm run build` | 生成生产构建并复制到 `dist/` |
| `npm run preview` | 预览生产构建 |
| `npm run test:modularization` | 执行模块化相关测试 |

## Supabase 初始化

项目使用 Supabase PostgreSQL、Storage、RLS 和成员角色控制。首次部署数据库时，按依赖顺序执行：

1. `supabase/workbench-entities.sql`
2. `supabase/resume-texts.sql`
3. `supabase/candidates.sql`
4. `supabase/resume-versions.sql`
5. `supabase/talent-source-channels.sql`
6. `supabase/talent-funnel-reasons.sql`
7. `supabase/talent-funnel-events.sql`
8. `supabase/workbuddy-files-storage.sql`
9. `supabase/user-todos.sql`（依赖第 1 步的 `touch_updated_at()`；手动待办与自动待办共用，含 RLS）
10. `supabase/workbench-permissions.sql`（管理员/顾问 RLS：候选人/推进/简历/待办按属主私有，公司/岗位共享；含 `is_workbench_admin()` helper）

渠道漏斗试点只统计满足当前试点范围和基线时间的数据。建议先在设置中配置量子计算试点公司的 ID 和开始时间，再开始录入新候选人。

## 技术架构

- 前端是单文件 Vue 3 SPA，主入口为 `index.html`。
- `src/` 下的业务模块通过经典 `<script>` 挂载到 `window`，不依赖前端打包器运行。
- Supabase 负责云端数据、成员权限、RLS 和私有简历文件。
- 候选人、简历文本、简历版本、公司 / 岗位 / 推进记录和渠道漏斗事件分别提供独立仓储。
- 渠道漏斗事件采用追加式记录，阶段统计由 `src/services/talent-funnel-analytics.js` 统一计算。
- AI 解析和漏斗建议使用现有 AI 网关；游客模式使用本地模拟结果。

## 目录结构

```text
.
├── index.html                         # SPA 主入口与工作台页面
├── src/
│   ├── workbench-v2.js                 # 工作台核心数据和人才操作
│   ├── services/
│   │   ├── talent-funnel-analytics.js  # 漏斗统计与卡点计算
│   │   ├── talent-funnel-ai.js         # AI 诊断提示和结果整理
│   │   ├── position-bulk-import.js     # AI 批量导入岗位
│   │   └── repo/                       # Supabase 数据仓储
│   └── ui/                             # 页面动作和展示模型
├── supabase/                           # SQL、RLS、索引和初始化脚本
├── scripts/build.js                    # 生产构建脚本
└── .github/workflows/deploy.yml       # 测试、构建和 GitHub Pages 部署
```

## 部署

推送 `main` 分支会自动触发 GitHub Actions：

```text
安装依赖 → npm test → npm run build → 发布 dist/ 到 GitHub Pages
```

部署记录：<https://github.com/chenyuhuan555/workbuddy-spa-site/actions/workflows/deploy.yml>

`dist/` 是构建产物，不需要手动提交。生产页面以 GitHub Pages 流水线产物为准。

## 数据口径约束

1. 漏斗按公司分别计算，不把多家公司混成一个总漏斗。
2. 候选人先入人才库，岗位匹配和推进是后续独立动作。
3. 渠道统计使用候选人的首次来源。
4. 系统事实由固定规则生成，AI 不直接改写数量、转化率或阶段状态。
5. 当前试点只看新产生的数据，历史数据不会自动混入试点统计。
6. 失败阶段需要填写原因码；原因码为“其他”时还需要补充说明。

## 更新日志

### 2026-08-18

- **P0-3 权限安全收口**：顾问 INSERT 强制归属自己（`ownerUserId = auth.uid()` 或 `owner=本人姓名`，禁止孤儿数据）；无 owner 岗位顾问只读（待管理员分配负责人）；简历 Storage 读策略按路径 `candidateId` 关联候选人属主（管理员全部、顾问仅自己的）；管理员首页待办支持「全部团队 / 指定顾问」筛选（`user_todos.loadAll` + RLS 兜底）；新增 `src/services/rls-contract.test.mjs` 守护 SQL 关键约束。
- 新增「管理员 / 顾问权限」：权限模块 `src/ui/workbench-permissions.js`（前端防御）+ `supabase/workbench-permissions.sql`（RLS 最终边界）。
- 角色复用现有 `admin`（管理员）/ `editor`（高级成员）/ `member`（普通成员）：admin → 管理员，editor / member → 顾问；editor 保留可写、member 保留只读。
- 归属规则：候选人 / 推进 / 待办 / 简历按属主私有（顾问只看自己的），公司 / 岗位团队共享可见；仅管理员可修改负责人（owner）。
- 新增 `ownerUserId`（稳定账号 id）存于 `extra->>'ownerUserId'`，`owner` 姓名继续用于展示；旧数据按 `profiles.display_name` 兼容。
- 前端：人才库 / 面试推进工作区按权限过滤；详情打开与推进操作带权限守卫；负责人筛选顾问固定自己、导入默认归属自己。
- 新增「面试 / 推进工作区」：左侧导航「面试进度」，一行 = 一条 Application 的高密度推进表格。
- 新增纯函数模块 `src/ui/application-progress-table.js`：buildRows / filterRows / sortRows / summarize，阶段、SLA、下一步、待办数全部从现有 Pipeline 常量与统一 Todo 派生，不新增重复业务字段。
- 新增自动待办（System Todo）能力：规则引擎 `src/services/todo-rule-engine.js` + 对账器 `src/services/todo-reconciler.js`。
- 第一版 5 条规则：候选人今日跟进、推荐后 2 天无反馈、明日面试提醒、面试结束未反馈、Offer 长时间未更新；按 `dedupeKey` 幂等去重。
- 补充 `supabase/user-todos.sql` 建表与 RLS 定义（手动 + 自动待办共用）。
- 推进详情支持录入面试时间（`interviewAt`），面试提醒与反馈规则生效。

### 2026-08-12

- 首页新增公司渠道漏斗和公司切换。
- 渠道卡片支持点击进入候选人批量导入。
- 候选人批量入库支持记录公司和首次来源。
- 新增渠道 Excel 候选人批量导入适配器，支持 AI 整理、预览编辑、查重后确认入库。
- 候选人尚未匹配岗位时，入库事件也可以进入渠道漏斗统计。
- 首页接入渠道漏斗 AI 卡点诊断和优化建议。
- 新增 AI 批量导入岗位能力和状态排版优化。

### 2026-08-05

- 新增游客演示模式，真实云端数据与游客数据完全隔离。

### 2026-08-02

- 完成候选人、简历版本和公司 / 岗位 / 推进记录的独立仓储及迁移保护。
