# 资讯中心固定知识库文档 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将资讯中心的新保存结果持续写入两个固定知识库文档，按日期置顶，并统一为无裸 `**` 的可渲染 Markdown。

**Architecture:** 在 `index.html` 现有知识库保存逻辑旁增加固定文档追加 helper，使用稳定 `documentKey` 查找或创建文档；AI 资讯与工作流启发合并为一个日期条目，行业解读与具体新闻合并为一个日期条目。现有历史文档不迁移，详情页继续复用 `renderMd`。

**Tech Stack:** Vue 3 CDN、单文件 SPA、现有 `kbArticles` 响应式数组、IndexedDB/工作区同步、Node test runner。

---

### Task 1: 固定文档追加与文本清理

**Files:**
- Modify: `index.html`（知识库保存 helper，约 13317 行）
- Test: `src/knowledge-base.test.mjs`（新增纯函数测试）

- [ ] **Step 1: 写失败测试**：覆盖 `stripKnowledgeMarkdownMarkers` 去掉代码围栏和 `**`、保留标题/列表；覆盖 `prependKnowledgeDocumentEntry` 新建固定文档、顶部追加、重复条目不追加。
- [ ] **Step 2: 运行测试确认失败**：`node --test src/knowledge-base.test.mjs`，预期因 helper 尚未导出而失败。
- [ ] **Step 3: 实现最小 helper**：在知识库逻辑中加入稳定文档 key、清理文本、日期条目格式化和顶部追加方法；重复判断使用 `entryKey` 或来源链接加内容摘要。
- [ ] **Step 4: 运行测试确认通过**：`node --test src/knowledge-base.test.mjs`。
- [ ] **Step 5: 提交切片**：`git add index.html src/knowledge-base.test.mjs && git commit -m "增加资讯固定知识库文档追加逻辑"`。

### Task 2: 接入 AI 资讯与行业动态保存入口

**Files:**
- Modify: `index.html`（AI 资讯和活水雷达保存函数及按钮文案）
- Test: `src/knowledge-base.test.mjs`

- [ ] **Step 1: 写失败测试**：验证 AI 保存条目同时包含摘要和工作流；行业保存条目包含解读、判断和具体新闻；单条 AI/行业新闻分别进入对应固定文档。
- [ ] **Step 2: 运行测试确认失败**：`node --test src/knowledge-base.test.mjs`。
- [ ] **Step 3: 接入保存入口**：`saveAiNewsSummaryToKnowledgeBase` 与 `saveAiNewsWorkflowToKnowledgeBase` 共同写入 AI 固定文档；`saveRadarInsightToKnowledgeBase` 拼入当前新闻；单条保存入口改为追加固定文档，不再创建散文档。
- [ ] **Step 4: 统一知识库详情渲染**：保存前保留标题、列表、来源链接等 Markdown 结构，清理裸 `**`；详情继续调用安全 `renderMd`，不引入新依赖。
- [ ] **Step 5: 运行回归测试与构建**：`npm test`、`npm run build`、`git diff --check`。
- [ ] **Step 6: 提交切片**：`git add index.html src/knowledge-base.test.mjs public/assets/workbuddy.css && git commit -m "统一资讯与行业动态知识库归档"`。

### Task 3: 部署与生产验证

**Files:**
- No source changes; verify committed files.

- [ ] **Step 1: 推送**：`git push origin HEAD:main`。
- [ ] **Step 2: 验证 GitHub Pages**：确认对应 commit 的 Actions 成功。
- [ ] **Step 3: 验证部署内容**：请求 `https://chenyuhuan555.github.io/workbuddy-spa-site/?v=<commit>`，检查状态 200，并确认固定文档 key、行业具体新闻归档和无 `**` 清理逻辑已发布。
