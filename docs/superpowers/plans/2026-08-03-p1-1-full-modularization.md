# P1-1 Full Single-File Modularization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task with review checkpoints.

**Goal:** 将 `index.html` 从业务逻辑集中入口收敛为模板、依赖加载和最小应用启动壳，同时保持现有 WorkBuddy 数据、权限、迁移和页面行为不变。

**Architecture:** 继续沿用当前的浏览器全局模块模式：每个模块通过 `window.WorkBuddy...` 暴露小而稳定的工厂或纯函数，入口只负责组装 Vue 响应式状态和依赖注入。按风险从简历后台处理、业务实体编排、搜索编排、旧版岗位工作流分批拆分，每批都有独立测试和完整回归。

**Tech Stack:** Vue 3 global build, browser scripts, Node `node:test`, Tailwind build, GitHub Pages Actions.

---

### Task 1: 简历后台编排收口

**Files:**
- Create: `src/services/resume-original-record-loader.js`
- Create: `src/services/resume-original-text-loader.js`
- Create: `src/services/resume-background-save-queue.js`
- Modify: `index.html`
- Test: corresponding `src/services/*.test.mjs`

- [x] 完成原始文件记录、文本加载和串行保存队列拆分。
- [x] 运行专项测试、全量测试和构建。

### Task 2: 岗位/推进/公司业务编排

**Files:**
- Create: `src/ui/workbench-entity-actions.js`
- Modify: `index.html`
- Test: `src/ui/workbench-entity-actions.test.mjs`

- [ ] 将公司、岗位、推进的创建、详情路由和阶段更新收敛为注入式动作工厂。
- [ ] 保留权限检查、唯一活跃推进和后台保存队列。
- [ ] 运行专项测试和全量回归。

### Task 3: 搜索与人才库编排

**Files:**
- Create: `src/ui/workbench-search-actions.js`
- Modify: `index.html`
- Test: `src/ui/workbench-search-actions.test.mjs`

- [ ] 抽离顶部全局搜索、云端全文搜索、候选人过滤和分页状态转换。
- [ ] 保留搜索结果数量、详情跳转和空结果错误提示。
- [ ] 运行浏览器静态检查和专项测试。

### Task 4: 旧版岗位工作流收口

**Files:**
- Create: `src/ui/legacy-job-actions.js`
- Modify: `index.html`
- Test: `src/ui/legacy-job-actions.test.mjs`

- [ ] 将 OCR、岗位创建、岗位编辑和旧版搜索动作隔离到兼容模块。
- [ ] 不删除旧数据字段，不改变旧路由回退。

### Task 5: 入口瘦身与质量收口

**Files:**
- Modify: `index.html`
- Modify: `scripts/build.js`
- Test: `src/services/production-build.test.mjs` and static checks

- [ ] 删除已迁移的重复本地函数和未使用变量。
- [ ] 检查脚本加载顺序、全局依赖和缓存版本号。
- [ ] 运行 `npm test`、`npm run build`、`git diff --check`。
- [ ] 使用浏览器验证首页、人才库、公司看板、岗位详情、推进详情和全文搜索。
- [ ] 提交、推送并确认 GitHub Pages 部署成功。
