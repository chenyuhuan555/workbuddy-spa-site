# 简历 AI 批量重新处理实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在人才库增加批量重新处理入口，串行处理所有未完成或失败的简历版本，并显示进度、失败原因和失败重试，同时保留原始文件、历史版本和业务记录。

**Architecture:** 新增纯逻辑 `ResumeAiBatch` 服务负责任务筛选、串行执行、取消和统计；页面只提供候选人简历版本列表、权限校验和现有 `enqueueResumeAiProcessing` 适配。批处理不直接修改人才数据，所有实际处理仍通过现有单份 AI 队列和保存链路完成。

**Tech Stack:** Vue 3 runtime、现有 ResumeAiProcessing 队列、Node `node:test`、GitHub Pages 静态构建。

---

### Task 1: 建立批处理器契约

**Files:**
- Create: `src/services/resume-ai-batch.js`
- Create: `src/services/resume-ai-batch.test.mjs`

- [ ] **Step 1: Write the failing tests**

覆盖以下行为：默认跳过 `formatStatus === 'done'` 且存在 `formattedText` 的版本；按任务顺序串行调用 `enqueue`；单个任务失败后继续后续任务并记录错误；统计 `completed/failed/skipped/total`；取消后不再启动新任务。

- [ ] **Step 2: Run the focused test and verify RED**

Run `node --test src/services/resume-ai-batch.test.mjs`，预期因模块不存在而失败。

- [ ] **Step 3: Implement the minimal batch API**

导出 `createBatchRunner({ enqueue })`，提供：

```js
runner.start(tasks, { refreshRawText = false, shouldProcess })
runner.cancel()
runner.state
```

`state` 至少包含 `running`、`cancelled`、`current`、`total`、`completed`、`failed`、`skipped`、`errors`；`start()` 返回完成 Promise，使用 `for...of` 保证串行，任务失败只写入 `errors` 并继续。

- [ ] **Step 4: Run the focused test and verify GREEN**

Run `node --test src/services/resume-ai-batch.test.mjs`，预期全部通过。

- [ ] **Step 5: Commit the isolated service**

```powershell
git add src/services/resume-ai-batch.js src/services/resume-ai-batch.test.mjs
git commit -m "feat: add serial resume ai batch runner"
```

### Task 2: 接入页面状态和批量动作

**Files:**
- Modify: `index.html`（脚本加载、人才库按钮、批处理状态、setup 函数）
- Modify: `src/services/resume-ai-batch.test.mjs`（必要时补页面契约测试）

- [ ] **Step 1: Add a failing static contract assertion**

断言页面加载 `resume-ai-batch.js`，暴露 `resumeAiBatch`，并包含“批量重新处理”“重试失败项”文案及 `startResumeAiBatch`、`retryResumeAiBatch`、`cancelResumeAiBatch` 函数。

- [ ] **Step 2: Run the contract test and verify RED**

Run `node --test src/services/resume-ai-batch.test.mjs`，预期新增页面断言失败。

- [ ] **Step 3: Wire the service into the page**

在人才库标题操作区增加批量入口；在 `setup()` 中增加 `resumeAiBatch = reactive(...)`。任务收集只读取当前 `workbenchV2.candidates` 的 `resumeVersions`，默认筛选未完成/失败版本；处理函数复用 `enqueueResumeAiProcessing(candidateId, versionId, { refreshRawText })`，不复制 AI 逻辑。

- [ ] **Step 4: Add progress and retry UI**

增加可访问的进度区域，显示总数、完成数、失败数、当前文件名；运行中提供取消按钮；完成后失败数大于 0 时提供“仅重试失败项”；提供“从原始文件重新提取”复选项，默认关闭。所有新增按钮明确 `type="button"`。

- [ ] **Step 5: Run focused and full tests**

Run `node --test src/services/resume-ai-batch.test.mjs` and `npm test`，预期全部通过。

### Task 3: 构建、检查与部署

**Files:**
- No unrelated files; preserve existing `public/assets/workbuddy.css` and deleted documentation state.

- [ ] **Step 1: Run production checks**

```powershell
npm run build
git diff --check
```

- [ ] **Step 2: Inspect the staged diff**

只暂存 `index.html`、`src/services/resume-ai-batch.js`、`src/services/resume-ai-batch.test.mjs`；确认没有把已有的 CSS 或文档删除变更带入提交。

- [ ] **Step 3: Commit and push**

```powershell
git add index.html src/services/resume-ai-batch.js src/services/resume-ai-batch.test.mjs
git commit -m "feat: add batch resume ai reprocessing"
git push origin main
```

- [ ] **Step 4: Verify GitHub Pages**

等待对应 Actions 完成且结论为 `success`，再请求 `https://chenyuhuan555.github.io/workbuddy-spa-site/?v=<commit>`，确认页面包含批量入口和进度文案。
