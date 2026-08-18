# 人才库云端全文搜索 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在人才库页面接入云端 `search_resumes` 全文搜索，并在云端不可用时稳定回退到现有本地分页搜索。

**Architecture:** 新增独立的 `talentCloudSearch` 内存状态和一个按请求序号收敛的搜索动作。搜索动作只调用现有 `src/services/repo/resume-search-repo.js`，不写入 `workbenchV2`；结果通过候选人 ID 映射到现有详情路由。云端失败保留本地人才列表并显示安全错误信息。

**Tech Stack:** Vue 3 runtime、Supabase RPC、现有 ResumeSearchRepo、Node `node:test` 静态测试、Tailwind 构建。

---

### Task 1: 锁定 Repository 与 UI 合同

**Files:**
- Modify: `src/services/repo/resume-search-repo.test.mjs`
- Modify: `src/services/repo/phase4-contract.test.mjs`

- [ ] **Step 1: 增加 Repository 空关键词、分页参数和错误码测试**

断言 `searchResumes('Java', 50, 100)` 调用 `search_resumes`，并断言非法空查询在 UI 层被拦截；保留现有错误码映射，不暴露 Supabase 原始响应。

- [ ] **Step 2: 增加前端接入合同的失败测试**

在 `phase4-contract.test.mjs` 中断言 `index.html` 具备 `WorkBuddyResumeSearchRepo`、`search_resumes`、`talentCloudSearch` 和“云端全文搜索”入口标记。先运行对应测试，确认新入口断言失败。

- [ ] **Step 3: 提交测试合同**

```powershell
git add src/services/repo/resume-search-repo.test.mjs src/services/repo/phase4-contract.test.mjs
git commit -m "test: define talent cloud search contract"
```

### Task 2: 添加人才库云端搜索状态与请求收敛

**Files:**
- Modify: `index.html`（人才库状态、搜索动作、setup 暴露）
- Test: `src/services/repo/phase4-contract.test.mjs`

- [ ] **Step 1: 新增响应式状态**

加入 `talentCloudSearch = reactive({ query: '', running: false, page: 1, pageSize: 50, total: 0, items: [], error: '', fallback: false, requestId: 0 })`，并通过 setup 返回对象暴露。

- [ ] **Step 2: 实现请求序号保护**

实现 `runTalentCloudSearch()`：空查询直接清空云端结果；每次请求递增 `requestId`；只有最新请求才能写入 `items/total/error`；成功结果不写入 `workbenchV2`。

- [ ] **Step 3: 实现分页动作**

实现 `changeTalentCloudSearchPage(page)`，收敛页码到 `1..ceil(total/pageSize)` 并重新请求当前 query。

- [ ] **Step 4: 实现失败回退**

将 `AUTH_REQUIRED`、`RPC_NOT_DEPLOYED`、`BACKEND_REQUEST_FAILED` 转为页面可读提示，设置 `fallback=true`，不清空上一次成功结果。

- [ ] **Step 5: 运行合同测试**

```powershell
node --test src/services/repo/phase4-contract.test.mjs
```

Expected: PASS。

### Task 3: 接入人才库 UI

**Files:**
- Modify: `index.html` 人才库列表模板
- Modify: `src/services/repo/phase4-contract.test.mjs`

- [ ] **Step 1: 添加云端搜索按钮和状态文本**

在现有人才库筛选栏增加 `type="button"` 的“云端全文搜索”按钮、加载状态、错误提示和回退提示；原有筛选控件不删除。

- [ ] **Step 2: 添加云端结果列表**

当 `talentCloudSearch.items.length` 大于 0 时展示候选人姓名、公司、文件名、匹配摘要和“查看详情”；详情跳转使用现有 `openCandidateDetail(item.candidateId)`，找不到本地候选人时禁用跳转并显示原因。

- [ ] **Step 3: 添加分页控件**

显示总数、当前页和上一页/下一页按钮；按钮全部声明 `type="button"`，搜索结果不替换本地人才列表。

- [ ] **Step 4: 增加 UI 静态回归断言**

断言入口可访问名称、错误提示、分页按钮和本地回退文本存在。

### Task 4: 验证、构建与部署

**Files:**
- No new source files

- [ ] **Step 1: 运行完整测试**

```powershell
npm test
```

Expected: 全部通过。

- [ ] **Step 2: 运行生产构建和差异检查**

```powershell
npm run build
git diff --check
```

Expected: 构建生成 `dist/`，无 diff whitespace 错误。

- [ ] **Step 3: 提交并推送**

```powershell
git add index.html src/services/repo/resume-search-repo.test.mjs src/services/repo/phase4-contract.test.mjs
git commit -m "feat: add talent cloud full-text search"
git push origin main
```

- [ ] **Step 4: 验证 GitHub Pages**

等待对应 Actions 成功后请求 `https://chenyuhuan555.github.io/workbuddy-spa-site/?v=<commit>`，确认页面包含“云端全文搜索”入口。
