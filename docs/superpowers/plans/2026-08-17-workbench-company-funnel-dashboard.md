# WorkBuddy Company Funnel Homepage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the WorkBuddy homepage around a single-row company recruitment funnel, channel progress list, compact todo table, and factual daily review while preserving all existing data sources and actions.

**Architecture:** Keep the existing Vue setup and business controllers in `index.html`. Add presentation-only computed values beside `homeFunnelStageSummary`, replace only the three homepage templates, and add scoped `.wb-home-*` styles. Use the existing static UI tests as regression contracts and regenerate the committed Tailwind CSS artifact.

**Tech Stack:** Vue 3 global build, HTML/CSS, inline SVG, Node.js `node:test`, Tailwind CSS build, Git.

---

### Task 1: Lock the company funnel and channel layout contract

**Files:**
- Modify: `src/ui/talent-funnel-dashboard.test.mjs`
- Modify: `index.html:3198-3265`
- Modify: `index.html:4174-4193`
- Modify: `index.html:13182-13216`

- [ ] **Step 1: Add the failing static UI test**

```js
test('首页使用横向公司招聘漏斗和渠道进度列表', () => {
  const dashboard = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.match(dashboard, /wb-home-company-funnel-grid/);
  assert.match(dashboard, /wb-home-pipeline/);
  assert.match(dashboard, /v-for="\(stage, index\) in homeFunnelStageSummary"/);
  assert.match(dashboard, /homeFunnelBusinessMetrics\.overallRate/);
  assert.match(dashboard, /homeFunnelChannelRows/);
  assert.match(dashboard, /openHomeFunnelCandidates\(stage\)/);
  assert.match(dashboard, /openHomeFunnelChannelDetails\(channel\)/);
  assert.match(dashboard, /openHomeFunnelChannelImport\(channel\)/);
  assert.doesNotMatch(dashboard, /wb-home-stage-row/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

```powershell
node --test src/ui/talent-funnel-dashboard.test.mjs
```

Expected: FAIL because the horizontal pipeline classes and presentation computed values do not exist.

- [ ] **Step 3: Add presentation-only funnel computed values**

Add immediately after `homeFunnelStageSummary`:

```js
const selectedHomeFunnelCompany = computed(() => workbenchV2.companies.find(company => company.id === homeFunnelCompanyId.value) || null);
const homeFunnelBusinessMetrics = computed(() => {
  const first = homeFunnelStageSummary.value[0]?.count || 0;
  const last = homeFunnelStageSummary.value.at(-1)?.count || 0;
  return {
    overallRate: first ? `${Math.round((last / first) * 1000) / 10}%` : '—',
    previousPeriod: '—',
    added: first,
  };
});
const homeFunnelChannelRows = computed(() => {
  const channels = Array.isArray(homeFunnelDashboard.model?.channels) ? homeFunnelDashboard.model.channels : [];
  const counts = channels.map(channel => Number(channel?.stages?.[0]?.count) || 0);
  const total = counts.reduce((sum, count) => sum + count, 0);
  const maximum = Math.max(0, ...counts);
  return channels.map((channel, index) => ({
    ...channel,
    count: counts[index],
    share: total ? Math.round((counts[index] / total) * 100) : 0,
    width: maximum ? Math.round((counts[index] / maximum) * 100) : 0,
  }));
});
```

Expose `selectedHomeFunnelCompany`, `homeFunnelBusinessMetrics`, and `homeFunnelChannelRows` from Vue setup.

- [ ] **Step 4: Implement the approved horizontal pipeline**

Replace the vertical stage rows with:

- One `.wb-home-company-funnel-grid`.
- A left `.wb-home-pipeline-card` containing six `.wb-home-pipeline-stage` buttons.
- Stage label, inline SVG icon, real count, cumulative share, and SVG connector.
- Five adjacent conversion labels.
- Three `.wb-home-funnel-metric` cells for overall conversion, previous period, and added count.
- A right `.wb-home-channel-card` rendering `homeFunnelChannelRows` with progress bars.

Keep `openHomeFunnelCandidates`, `openHomeFunnelChannelDetails`, and `openHomeFunnelChannelImport` unchanged.

- [ ] **Step 5: Add scoped funnel CSS**

```css
.wb-v2-workspace .wb-home-dashboard { background: #fafaf8; padding: 28px 28px 36px; }
.wb-v2-workspace .wb-home-funnel-section { border: 1px solid #e9ecea; border-radius: 12px; background: #fff; padding: 22px; }
.wb-v2-workspace .wb-home-company-funnel-grid { display: grid; grid-template-columns: minmax(0, 7fr) minmax(280px, 3fr); gap: 18px; }
.wb-v2-workspace .wb-home-pipeline { display: grid; grid-template-columns: repeat(6, minmax(104px, 1fr)); min-width: 720px; }
.wb-v2-workspace .wb-home-pipeline-stage { position: relative; min-width: 0; padding: 18px 12px 14px; text-align: center; }
.wb-v2-workspace .wb-home-pipeline-stage strong { display: block; margin-top: 10px; color: #0f172a; font-size: 32px; line-height: 1; }
.wb-v2-workspace .wb-home-channel-track { height: 8px; overflow: hidden; border-radius: 999px; background: #f0f2f1; }
.wb-v2-workspace .wb-home-channel-fill { height: 100%; border-radius: inherit; background: #087a55; }
@media (max-width: 1180px) {
  .wb-v2-workspace .wb-home-company-funnel-grid { grid-template-columns: 1fr; }
  .wb-v2-workspace .wb-home-pipeline-scroll { overflow-x: auto; }
}
```

At 1440px the six stages remain on one line. Below the desktop breakpoint, scroll the pipeline instead of wrapping it.

- [ ] **Step 6: Run the focused test and confirm GREEN**

```powershell
node --test src/ui/talent-funnel-dashboard.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit the funnel slice**

```powershell
git add index.html src/ui/talent-funnel-dashboard.test.mjs
git commit -m "style: rebuild homepage company funnel"
```

### Task 2: Build the compact todo and factual review workspace

**Files:**
- Modify: `src/ui/talent-funnel-dashboard.test.mjs`
- Modify: `index.html:3230-3260`
- Modify: `index.html:4195-4197`
- Modify: `index.html:13196-13216`

- [ ] **Step 1: Add the failing todo and review test**

```js
test('今日待办与今日复盘使用紧凑两栏工作区', () => {
  const dashboard = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.match(dashboard, /wb-home-execution-grid/);
  assert.match(dashboard, /homeTodoTabs/);
  assert.match(dashboard, /filteredHomeTodos/);
  assert.match(dashboard, /wb-home-todo-status/);
  assert.match(dashboard, /homeFunnelAiSummary/);
  assert.match(dashboard, /AI 智能总结/);
  assert.match(dashboard, /v-model="homeReviewNotes\.issue"/);
  assert.match(dashboard, /v-model="homeReviewNotes\.tomorrow"/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

```powershell
node --test src/ui/talent-funnel-dashboard.test.mjs
```

Expected: FAIL because the execution grid, todo filter view, status presentation, and factual summary are absent.

- [ ] **Step 3: Add presentation-only todo filtering and factual summary**

```js
const homeTodoFilter = ref('all');
const homeTodoRows = computed(() => dashboardTodos.value.map(todo => {
  const text = `${todo.type || ''} ${todo.title || ''}`;
  const category = /面试/.test(text) ? 'interview' : /推荐/.test(text) ? 'recommendation' : /反馈/.test(text) ? 'feedback' : 'touch';
  return { ...todo, category };
}));
const homeTodoTabs = computed(() => [
  { key: 'all', label: '全部', count: homeTodoRows.value.length },
  { key: 'touch', label: '待触达', count: homeTodoRows.value.filter(todo => todo.category === 'touch').length },
  { key: 'feedback', label: '待反馈', count: homeTodoRows.value.filter(todo => todo.category === 'feedback').length },
  { key: 'recommendation', label: '待推荐', count: homeTodoRows.value.filter(todo => todo.category === 'recommendation').length },
  { key: 'interview', label: '待面试', count: homeTodoRows.value.filter(todo => todo.category === 'interview').length },
]);
const filteredHomeTodos = computed(() => homeTodoFilter.value === 'all'
  ? homeTodoRows.value
  : homeTodoRows.value.filter(todo => todo.category === homeTodoFilter.value));
const homeFunnelAiSummary = computed(() => {
  const added = homeFunnelReview.value.added;
  const touched = homeFunnelReview.value.touched;
  const touchRate = added ? Math.round((touched / added) * 100) : 0;
  const primary = homeFunnelChannelRows.value.slice().sort((a, b) => b.count - a.count)[0];
  if (!added) return '当前筛选范围内暂无新增人才，建议先补充渠道数据并保持推进记录完整。';
  return `当前新增人才 ${added} 位${primary?.count ? `，主要来源为${primary.channelName}` : ''}。触达率为 ${touchRate}%，尚有 ${Math.max(added - touched, 0)} 位未触达人才。`;
});
```

Expose `homeTodoFilter`, `homeTodoTabs`, `filteredHomeTodos`, and `homeFunnelAiSummary` from Vue setup.

- [ ] **Step 4: Implement the 65% / 35% execution grid**

Wrap both sections in `.wb-home-execution-grid`.

Todo section:
- Render `homeTodoTabs` as buttons that update `homeTodoFilter`.
- Render `filteredHomeTodos.slice(0, 6)` in a compact five-column table.
- Apply a category class to `.wb-home-todo-status`.
- Keep `openTodoDetail`, `openTodoListView`, and `openTodoForm`.

Review section:
- Render five existing funnel totals.
- Render `.wb-home-ai-summary` with `homeFunnelAiSummary`.
- Render two compact, side-by-side textareas bound to `homeReviewNotes.issue` and `homeReviewNotes.tomorrow`.

- [ ] **Step 5: Add scoped execution-area CSS**

```css
.wb-v2-workspace .wb-home-execution-grid { display: grid; grid-template-columns: minmax(0, 13fr) minmax(340px, 7fr); gap: 18px; }
.wb-v2-workspace .wb-home-activity-section { border: 1px solid #e9ecea; border-radius: 12px; background: #fff; padding: 20px; }
.wb-v2-workspace .wb-home-todo-table { min-width: 760px; font-size: 14px; }
.wb-v2-workspace .wb-home-todo-status { display: inline-flex; border-radius: 999px; padding: 4px 9px; font-size: 12px; }
.wb-v2-workspace .wb-home-ai-summary { margin-top: 16px; border-radius: 10px; background: #f2f8f5; padding: 16px; color: #334155; }
.wb-v2-workspace .wb-home-review-notes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 14px; }
@media (max-width: 1180px) {
  .wb-v2-workspace .wb-home-execution-grid { grid-template-columns: 1fr; }
}
```

- [ ] **Step 6: Run the focused test and confirm GREEN**

```powershell
node --test src/ui/talent-funnel-dashboard.test.mjs
```

Expected: all tests pass.

- [ ] **Step 7: Commit the execution-area slice**

```powershell
git add index.html src/ui/talent-funnel-dashboard.test.mjs
git commit -m "style: compact homepage todo and review"
```

### Task 3: Verify responsive behavior and production output

**Files:**
- Generated: `public/assets/workbuddy.css`
- Verify: `index.html`
- Verify: `src/ui/talent-funnel-dashboard.test.mjs`

- [ ] **Step 1: Run the complete test suite serially**

```powershell
npm test
```

Expected: exit code 0 and zero failed tests.

- [ ] **Step 2: Generate production CSS and build output**

```powershell
npm run build
```

Expected: exit code 0 and `✓ 构建完成 → dist/`.

- [ ] **Step 3: Verify the real page in a browser**

At 1440px, 1600px, and 1920px verify:

- Six funnel stages remain on one row at 1440px.
- Funnel and channel source occupy the primary first-screen region.
- Todo and review align as 65% / 35% on desktop.
- Existing top navigation remains compact and the sidebar keeps its flat selected, hover, and account treatments without structural changes.
- Selectors, refresh, import, stage, channel, todo, and note interactions remain usable.
- No raw Vue interpolation, startup error, console error, or failed same-origin asset request appears.

- [ ] **Step 4: Review only intended changes**

```powershell
git diff --check
git status --short
git diff -- index.html src/ui/talent-funnel-dashboard.test.mjs public/assets/workbuddy.css
```

Expected: no whitespace errors; `tasks/plan.md` and `tasks/todo.md` remain unstaged and unchanged by this work.

- [ ] **Step 5: Commit the generated CSS after verification**

```powershell
git add public/assets/workbuddy.css
git commit -m "build: refresh homepage dashboard styles"
```

- [ ] **Step 6: Re-run the focused test after the final commit**

```powershell
node --test src/ui/talent-funnel-dashboard.test.mjs
```

Expected: all tests pass.
