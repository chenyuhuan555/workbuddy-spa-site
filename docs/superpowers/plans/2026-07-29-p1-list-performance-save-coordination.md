# P1 列表性能与保存协调 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将公司、人才、推进主列表限制为每页 50 条，用 Map 消除逐行线性关联查询，并把深度监听触发的本地保存改为 500ms 防抖、单通道串行保存和可见状态。

**Architecture:** 新增两个无框架 IIFE 模块：`list-performance.js` 提供纯分页/索引函数，`save-coordinator.js` 提供可注入计时器的保存状态机。`index.html` 只负责用 Vue computed/ref 接线；现有深度 watcher 暂时保留，但只调用脏标记入口。

**Tech Stack:** Vue 3 global build、原生 JavaScript IIFE、Node `node:test`、IndexedDB、Supabase workspace snapshot。

---

### Task 1: 建立分页和索引纯函数

**Files:**
- Create: `src/ui/list-performance.js`
- Create: `src/ui/list-performance.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试**

测试必须覆盖 `paginate([], 9, 50)`、50/51 条边界、请求页码越界、`indexById` 忽略空 ID、`groupBy` 缺失键回退为空数组。核心断言如下：

```js
import test from 'node:test';
import assert from 'node:assert/strict';
await import('./list-performance.js');
const { paginate, indexById, groupBy } = globalThis.WorkBuddyListPerformance;

test('paginate 将页码收敛并返回可展示区间', () => {
  const items = Array.from({ length: 51 }, (_, index) => ({ id: `c${index + 1}` }));
  assert.deepEqual(paginate(items, 2, 50), {
    items: [items[50]], page: 2, pageSize: 50, total: 51,
    totalPages: 2, start: 51, end: 51,
  });
  assert.equal(paginate(items, 99, 50).page, 2);
  assert.equal(paginate([], 9, 50).page, 1);
});

test('索引和分组只遍历源集合一次', () => {
  const rows = [{ id: 'a', ownerId: 'u1' }, { id: 'b', ownerId: 'u1' }, { id: '', ownerId: '' }];
  assert.equal(indexById(rows).get('a'), rows[0]);
  assert.deepEqual(groupBy(rows, row => row.ownerId).get('u1'), rows.slice(0, 2));
  assert.deepEqual(groupBy(rows, row => row.ownerId).get('missing') || [], []);
});
```

- [ ] **Step 2: 验证测试失败**

Run: `node --test src/ui/list-performance.test.mjs`

Expected: FAIL，原因是 `src/ui/list-performance.js` 不存在或全局 API 未定义。

- [ ] **Step 3: 实现最小纯函数模块**

```js
(function initListPerformance(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyListPerformance = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createListPerformance() {
  const PAGE_SIZE = 50;
  function paginate(source, requestedPage = 1, pageSize = PAGE_SIZE) {
    const items = Array.isArray(source) ? source : [];
    const size = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : PAGE_SIZE;
    const totalPages = Math.max(1, Math.ceil(items.length / size));
    const page = Math.min(totalPages, Math.max(1, Number.parseInt(requestedPage, 10) || 1));
    const offset = (page - 1) * size;
    const pageItems = items.slice(offset, offset + size);
    return { items: pageItems, page, pageSize: size, total: items.length, totalPages,
      start: items.length ? offset + 1 : 0, end: items.length ? offset + pageItems.length : 0 };
  }
  function indexById(source) {
    const map = new Map();
    for (const item of Array.isArray(source) ? source : []) if (item?.id) map.set(item.id, item);
    return map;
  }
  function groupBy(source, keyOf) {
    const map = new Map();
    for (const item of Array.isArray(source) ? source : []) {
      const key = keyOf(item);
      if (key === undefined || key === null || key === '') continue;
      const group = map.get(key);
      if (group) group.push(item); else map.set(key, [item]);
    }
    return map;
  }
  return { PAGE_SIZE, paginate, indexById, groupBy };
});
```

- [ ] **Step 4: 接入测试命令并验证**

在 `package.json` 的 `test` 脚本末尾加入 `src/ui/list-performance.test.mjs`。

Run: `npm test`

Expected: 新增测试和现有测试全部 PASS。

- [ ] **Step 5: 提交**

```powershell
git add src/ui/list-performance.js src/ui/list-performance.test.mjs package.json
git commit -m "perf: add reusable pagination and lookup indexes"
```

### Task 2: 三个主列表接入 50 条分页和 Map

**Files:**
- Modify: `index.html:7-20,4169-4194,4420-4430,4560-4580,10600-10640,10930-10945,12100-12115,22522-22540`
- Modify: `src/workbench-v2.test.mjs`

- [ ] **Step 1: 写静态失败测试**

在 `src/workbench-v2.test.mjs` 增加断言：入口加载 `./src/ui/list-performance.js`；三个主循环分别使用 `pagedWorkbenchCompanies.items`、`pagedWorkbenchCandidates.items`、`pagedApplications.items`；主列表片段不再包含 `workbenchV2.*.find` 或 `workbenchV2.applications.filter`。

```js
test('工作台三个主列表使用分页结果和预构建索引', () => {
  assert.match(INDEX_HTML, /<script src="\.\/src\/ui\/list-performance\.js"><\/script>/);
  assert.match(INDEX_HTML, /v-for="company in pagedWorkbenchCompanies\.items"/);
  assert.match(INDEX_HTML, /v-for="candidate in pagedWorkbenchCandidates\.items"/);
  assert.match(INDEX_HTML, /v-for="application in pagedApplications\.items"/);
  const section = (start, end) => INDEX_HTML.slice(INDEX_HTML.indexOf(start), INDEX_HTML.indexOf(end));
  const mainLists = [
    section("workbenchNav === 'companies' && workbenchRoute.type === 'list'", "workbenchNav === 'companies' && workbenchRoute.type === 'company'"),
    section("workbenchNav === 'candidates' && workbenchRoute.type === 'list'", "workbenchNav === 'candidates' && workbenchRoute.type === 'candidate'"),
    section("workbenchNav === 'applications' && workbenchRoute.type === 'list'", "workbenchNav === 'applications' && workbenchRoute.type === 'application'"),
  ].join('\n');
  assert.doesNotMatch(mainLists, /workbenchV2\.(candidates|companies|positions|applications)\.(find|filter)\(/);
  assert.doesNotMatch(mainLists, /filteredApplications\.filter\(/);
});
```

- [ ] **Step 2: 验证测试失败**

Run: `node --test src/workbench-v2.test.mjs`

Expected: FAIL，仍使用完整过滤数组和模板内查找。

- [ ] **Step 3: 增加 Vue 分页与索引状态**

加载模块后解构 `PAGE_SIZE/paginate/indexById/groupBy`。在 setup 中增加：

```js
const companyPage = ref(1);
const candidatePage = ref(1);
const applicationPage = ref(1);
const candidateById = computed(() => indexById(workbenchV2.candidates));
const positionById = computed(() => indexById(workbenchV2.positions));
const companyById = computed(() => indexById(workbenchV2.companies));
const applicationsByCandidateId = computed(() => groupBy(workbenchV2.applications, item => item.candidateId));
const positionsByCompanyId = computed(() => groupBy(workbenchV2.positions, item => item.companyId));
const applicationsByCompanyId = computed(() => groupBy(workbenchV2.applications, item => item.companyId));
const pagedWorkbenchCompanies = computed(() => paginate(filteredWorkbenchCompanies.value, companyPage.value, PAGE_SIZE));
const pagedWorkbenchCandidates = computed(() => paginate(filteredWorkbenchCandidates.value, candidatePage.value, PAGE_SIZE));
const pagedApplications = computed(() => paginate(filteredApplications.value, applicationPage.value, PAGE_SIZE));
```

使用三个长度 watcher 收敛当前页；使用筛选对象 watcher 将对应页码重置为 1。不要在详情返回时重置页码。

- [ ] **Step 4: 修改模板和分页控件**

三个主循环改用 `.items`。关联名称改用 `candidateById.get(id)?.name` 等。候选人活跃推进数改为：

```html
{{ (applicationsByCandidateId.get(candidate.id) || []).filter(item => item.stage !== SK.CLOSED).length }}
```

随后将这段过滤进一步移入 `activeApplicationCountByCandidateId` 计数 Map，确保最终主列表模板没有 `.filter()`。

推进看板不能继续对完整 `filteredApplications` 分组。新增 `pagedApplicationStageGroups` computed，把 `pagedApplications.value.items` 按 `applicationStageGroups` 的阶段集合分配到各列；列标题显示“本页数量”，分页总数仍显示完整过滤结果数量。

每个列表尾部加入同一语义结构，但绑定各自分页对象和页码：

```html
<nav v-if="pagedWorkbenchCompanies.total" aria-label="公司列表分页" class="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-100 text-sm">
  <span>第 {{ pagedWorkbenchCompanies.start }}–{{ pagedWorkbenchCompanies.end }} 条，共 {{ pagedWorkbenchCompanies.total }} 条</span>
  <div class="flex items-center gap-2">
    <button type="button" :disabled="pagedWorkbenchCompanies.page === 1" @click="companyPage = 1">首页</button>
    <button type="button" :disabled="pagedWorkbenchCompanies.page === 1" @click="companyPage -= 1">上一页</button>
    <span aria-live="polite">第 {{ pagedWorkbenchCompanies.page }} / {{ pagedWorkbenchCompanies.totalPages }} 页</span>
    <button type="button" :disabled="pagedWorkbenchCompanies.page === pagedWorkbenchCompanies.totalPages" @click="companyPage += 1">下一页</button>
    <button type="button" :disabled="pagedWorkbenchCompanies.page === pagedWorkbenchCompanies.totalPages" @click="companyPage = pagedWorkbenchCompanies.totalPages">末页</button>
  </div>
</nav>
```

- [ ] **Step 5: 暴露模板状态并验证**

把三个页码、三个分页 computed 和所需 Map 加入 setup 返回对象。

Run: `npm test`

Expected: 全部 PASS；静态测试确认主列表无逐行 `find/filter`。

- [ ] **Step 6: 提交**

```powershell
git add index.html src/workbench-v2.test.mjs
git commit -m "perf: paginate workbench lists at fifty records"
```

### Task 3: 建立 500ms 防抖串行保存协调器

**Files:**
- Create: `src/services/save-coordinator.js`
- Create: `src/services/save-coordinator.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: 写失败测试**

使用可控假计时器和 deferred Promise 验证：500ms 内三次请求只执行一次；保存进行中再次请求时最大并发为 1 且执行第二批；失败进入 `error`；`retry()` 成功进入 `saved`。

```js
test('保存进行中新增脏数据会串行执行下一批', async () => {
  let active = 0; let maxActive = 0; const releases = [];
  const coordinator = createSaveCoordinator({ delay: 500, save: async domains => {
    active += 1; maxActive = Math.max(maxActive, active);
    await new Promise(resolve => releases.push(resolve));
    active -= 1; return domains;
  }});
  coordinator.markDirty('workbench');
  const first = coordinator.flush();
  coordinator.markDirty('legacy');
  releases.shift()(); await first;
  const second = coordinator.flush();
  releases.shift()(); await second;
  assert.equal(maxActive, 1);
  assert.equal(coordinator.getState().status, 'saved');
});
```

- [ ] **Step 2: 验证测试失败**

Run: `node --test src/services/save-coordinator.test.mjs`

Expected: FAIL，模块不存在。

- [ ] **Step 3: 实现状态机**

模块必须使用与现有 `sync-merge.js` 一致的 IIFE 全局导出：

```js
(function initSaveCoordinator(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddySaveCoordinator = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createModule() {
  function createSaveCoordinator({ delay = 500, save, setTimer = setTimeout, clearTimer = clearTimeout, now = Date.now }) {
    if (typeof save !== 'function') throw new TypeError('save must be a function');
    const dirty = new Set();
    const listeners = new Set();
    let timer = null;
    let inFlight = null;
    let disposed = false;
    let revision = 0;
    let lastFailedDomains = new Set();
    let state = { status: 'idle', error: '', savedAt: '' };
    const publish = patch => {
      state = { ...state, ...patch };
      for (const listener of listeners) listener({ ...state });
    };
    const schedule = () => {
      if (disposed) return;
      if (timer) clearTimer(timer);
      timer = setTimer(() => { timer = null; void flush(); }, delay);
    };
    const run = async () => {
      while (!disposed && dirty.size) {
        const domains = new Set(dirty); dirty.clear();
        const batchRevision = ++revision;
        publish({ status: 'saving', error: '' });
        try {
          await save(domains);
          lastFailedDomains = new Set();
          if (batchRevision === revision) publish({ status: 'saved', error: '', savedAt: new Date(now()).toISOString() });
        } catch (error) {
          lastFailedDomains = domains;
          publish({ status: 'error', error: String(error?.message || error), savedAt: state.savedAt });
          throw error;
        }
      }
    };
    const flush = () => {
      if (timer) { clearTimer(timer); timer = null; }
      if (!inFlight) inFlight = run().finally(() => { inFlight = null; });
      return inFlight;
    };
    return {
      markDirty(domain) { if (!disposed && domain) { dirty.add(domain); schedule(); } },
      flush,
      retry() { for (const domain of lastFailedDomains) dirty.add(domain); return flush(); },
      subscribe(listener) { listeners.add(listener); listener({ ...state }); return () => listeners.delete(listener); },
      getState() { return { ...state }; },
      dispose() { disposed = true; if (timer) clearTimer(timer); timer = null; listeners.clear(); },
    };
  }
  return { createSaveCoordinator };
});
```

如果测试发现保存进行中 `flush()` 返回当前 Promise 而没有等待随后新增的 dirty 批次，调整 `flush()` 使其在当前批次结束后继续 drain，最终 Promise 必须覆盖所有已排队数据。

- [ ] **Step 4: 验证并提交**

Run: `npm test`

Expected: 全部 PASS，测试记录的最大并发为 1。

```powershell
git add src/services/save-coordinator.js src/services/save-coordinator.test.mjs package.json
git commit -m "perf: serialize debounced workspace persistence"
```

### Task 4: 接入本地保存和状态 UI

**Files:**
- Modify: `index.html:12175-12215,14142-14220,14618-14632,22522-22550`
- Modify: `src/workbench-v2.test.mjs`

- [ ] **Step 1: 写失败接线测试**

断言入口加载保存协调器；深度 watcher 只出现 `markDirty('legacy')` / `markDirty('workbench')`，不直接出现 `localSave()`、`saveWorkbenchV2()`、`schedulePush()`；模板具有 `role="status"` 和三个中文状态。

- [ ] **Step 2: 验证失败**

Run: `node --test src/workbench-v2.test.mjs`

Expected: FAIL，watcher 仍直接保存。

- [ ] **Step 3: 让保存函数可等待**

将 `localSave()` 改为 `async function localSave()`，同步写入 localStorage 后，把 IndexedDB 主快照、知识库快照和元数据任务组成 `await Promise.all(...)`，成功返回 `true`，失败记录错误并返回 `false`。保留现有调用方兼容性，不批量改写所有显式 `await saveWorkbenchV2()` 入口。

- [ ] **Step 4: 创建协调器和状态**

```js
const saveState = reactive({ status: 'idle', error: '', savedAt: '' });
const saveCoordinator = WorkBuddySaveCoordinator.createSaveCoordinator({
  delay: 500,
  save: async domains => {
    if (domains.has('legacy') && !await localSave()) throw new Error('旧版工作区保存失败');
    if (domains.has('workbench') && !await saveWorkbenchV2()) throw new Error('工作台保存失败');
    if (cloudReady) schedulePush();
  },
});
saveCoordinator.subscribe(next => Object.assign(saveState, next));
const markDirty = domain => saveCoordinator.markDirty(domain);
const retryLocalSave = () => saveCoordinator.retry();
```

watcher 改为只调用 `markDirty`。卸载时调用 `saveCoordinator.dispose()`。

- [ ] **Step 5: 增加状态 UI**

```html
<button v-if="saveState.status === 'error'" type="button" @click="retryLocalSave" role="status" aria-live="polite">保存失败，点击重试</button>
<span v-else role="status" aria-live="polite">{{ saveState.status === 'saving' ? '正在保存…' : saveState.status === 'saved' ? '已保存' : '' }}</span>
```

- [ ] **Step 6: 自动化和浏览器验证**

Run: `npm test`

Run: `npm run build`

Expected: 全部 PASS；`dist/` 构建成功。浏览器连续编辑 10 次时保存状态只经历合并后的保存批次，无并发写入报错。

- [ ] **Step 7: 提交**

```powershell
git add index.html src/workbench-v2.test.mjs
git commit -m "feat: show reliable local save progress"
```
