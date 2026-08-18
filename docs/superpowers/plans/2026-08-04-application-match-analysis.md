# 候选人岗位 AI 匹配分析 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 在单条候选人-岗位推进记录中生成、保存并展示独立的 AI 匹配度分析。

**Architecture:** 新增无框架动作模块，注入当前 application、候选人和岗位数据、AI 网关及保存回调。入口文件仅负责 Vue 状态绑定和页面布局，结果写入 `application.aiMatchAnalysis`，失败时保留旧结果。

**Tech Stack:** 原生 ESM 模块、Vue 3 响应式状态、现有 `callDeepSeekWithProgress` AI 网关、Node 内置 `node:test`。

---

### Task 1: 建立失败测试和 AI 匹配动作模块

**Files:**
- Create: `src/ui/application-match-analysis-actions.test.mjs`
- Create: `src/ui/application-match-analysis-actions.js`
- Modify: `package.json`（将测试加入 `test:modularization`）

- [ ] **Step 1: 写失败测试**

覆盖四个契约：成功生成并归一化结果、输入不足不调用 AI、AI/JSON 失败保留旧结果、分析中重复触发被拒绝。

- [ ] **Step 2: 运行测试确认失败**

运行 `node --test src/ui/application-match-analysis-actions.test.mjs`，预期因模块不存在失败。

- [ ] **Step 3: 实现最小模块**

导出 `createApplicationMatchAnalysisActions({ getContext, callAi, save, showToast, now })`，提供 `analyze()`；校验当前 application、候选人简历文本、岗位 description/skills；调用 `task: 'application-match-analysis'`；解析 JSON 并将 score 限制在 0–100、数组字段归一化；只有保存成功后才替换 `application.aiMatchAnalysis`。

- [ ] **Step 4: 运行模块测试确认通过**

运行 `node --test src/ui/application-match-analysis-actions.test.mjs`，预期全部通过。

- [ ] **Step 5: 加入模块化测试脚本**

在 `package.json` 的 `test:modularization` 末尾加入 `src/ui/application-match-analysis-actions.test.mjs`。

### Task 2: 接入入口文件与推进详情状态

**Files:**
- Modify: `index.html:90-105`（脚本加载）
- Modify: `index.html:3906-4010`（推进详情 UI）
- Modify: `index.html:10480-10530`（application 状态/计算属性区域）
- Modify: `index.html` 的 setup 暴露区域（暴露分析动作和状态）

- [ ] **Step 1: 注册模块脚本**

在其他 `src/ui` 脚本后加入带版本查询参数的 `application-match-analysis-actions.js`。

- [ ] **Step 2: 建立当前 application 的分析状态绑定**

初始化 `applicationMatchAnalysis` 的 `running/error/result` 展示状态；注入 `selectedApplication`、`selectedApplicationCandidate` 和通过 `positionId` 找到的岗位；保存回调使用现有 `saveWorkbenchV2()`。

- [ ] **Step 3: 接入分析按钮**

在推进详情的候选人信息/阶段卡片附近加入按钮“AI 匹配分析”；运行中显示“分析中…”，无写权限或无 AI 配置时沿用现有权限门禁。

- [ ] **Step 4: 增加结果展示**

展示 score、conclusion、strengths、risks、verifyQuestions 和 recommendation；显示生成时间；已有结果在刷新后直接读取 `selectedApplication.aiMatchAnalysis`。

- [ ] **Step 5: 接入明确错误提示**

将输入不足、AI 失败、返回格式错误和保存失败显示在分析卡片内；调用失败不清空旧结果。

### Task 3: 回归验证与发布

**Files:**
- Modify only intended source/test files above。

- [ ] **Step 1: 运行模块化测试**

运行 `npm run test:modularization`，预期全通过。

- [ ] **Step 2: 运行全量测试、构建和差异检查**

并行运行 `npm test`、`npm run build`、`git diff --check`，预期 0 失败、构建生成 `dist/`。

- [ ] **Step 3: 检查入口脚本与工作区状态**

确认新增模块已被 `index.html` 加载，且不暂存既有的 `public/assets/workbuddy.css` 修改和已删除的介绍文档。

- [ ] **Step 4: 提交并推送**

使用提交信息 `feat: add application match analysis`，推送到 `origin main`。

- [ ] **Step 5: 验证 GitHub Pages 部署**

根据提交 SHA 查询 Actions，记录运行链接与最终状态；若仍在运行，明确告知用户部署进行中。
