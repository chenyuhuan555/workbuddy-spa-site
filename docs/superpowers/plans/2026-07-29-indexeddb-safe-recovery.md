# IndexedDB Safe Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 无损修复 WorkBuddy 的 IndexedDB 结构和错误传播，使简历原始文件能够保存，并消除启动阶段绕过保存队列的异常写入。

**Architecture:** IndexedDB schema 通过 v6 升级事务补齐缺失结构，已有记录保持原样；存储错误在缓存层规范化后抛给 UI。启动迁移只标记脏数据，并由现有防抖串行协调器在 hydration 完成后保存。

**Tech Stack:** 原生 IndexedDB、Vue 3、Node `node:test`、GitHub Pages

---

### Task 1: 建立存储故障回归测试

**Files:**
- Modify: `src/storage/indexeddb-cache.test.mjs`
- Modify: `src/services/save-coordinator.test.mjs`

- [x] 增加模拟 v5 结构缺少 `files` 的测试，期望 `openResumeCacheDb()` 明确拒绝。
- [x] 增加底层打开失败时 `saveResumeBlob()` 抛出具体异常的测试。
- [x] 增加静态契约测试，禁止 `localLoad()` 的异常路径删除主快照，并要求启动迁移通过协调器。
- [x] 单独运行新增测试，确认修改实现前失败。

### Task 2: 实施无损数据库恢复

**Files:**
- Modify: `src/storage/indexeddb-cache.js`
- Modify: `index.html`

- [x] 将数据库版本升级为 6，升级事务只补齐缺失 store/index。
- [x] 打开成功后验证 `files` 与 `appSnapshots`，处理 blocked 和 versionchange。
- [x] 将原始简历保存失败改为保留错误类型和消息并向调用层抛出。
- [x] 让批量与单份导入展示具体存储错误。
- [x] 将启动迁移保存放入 `saveCoordinator`，并禁止读取错误自动删除快照。
- [x] 运行新增测试并确认通过。

### Task 3: 完整验证与部署

**Files:**
- Verify: `index.html`
- Verify: `src/**/*.js`
- Verify: `dist/**`

- [x] 运行 `npm test`，期望全部通过。
- [x] 运行 `npm run build`，期望退出码为 0。
- [x] 解析全部内联脚本，期望无语法错误。
- [x] 检查 Git diff，确认没有删除数据库或现有数据的代码。
- [ ] 提交并推送 `main`。
- [ ] 等待 GitHub Pages 部署，然后检查线上 HTML 与关键资源返回 200。
