# WorkBuddy Talent Library Excel Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current low-density talent list with a compact Excel-like candidate worktable that supports reliable multi-Application flow display, combined date filters, configurable columns, and a reusable right-side candidate detail drawer.

**Architecture:** Add one pure UMD-style UI adapter module that converts existing Candidate/Application/Position/Company data into display-only talent rows and applies date/search filters without mutating business entities. Keep `index.html` as the Vue composition root, reuse existing resume/detail loaders, and render the existing candidate detail surface in drawer or full-page mode from one markup tree. Persist only column visibility in LocalStorage; do not change the database or Candidate/Application contracts.

**Tech Stack:** Vue 3 Composition API in the existing single-file SPA, existing WorkbenchV2 and WorkBuddyPipeline globals, Tailwind-generated utility CSS plus focused scoped CSS, Node `node:test`, Vite/build scripts.

---

## File responsibility map

- Create `src/ui/talent-library-table.js`: pure column definitions, Candidate/`extraFields` compatibility reads, multi-Application joins, business timestamps, search/filtering, summaries, and safe column preference persistence.
- Create `src/ui/talent-library-table.test.mjs`: unit coverage for mapping, search, date boundaries, multi-Application ordering, empty fields, and LocalStorage recovery.
- Create `src/ui/talent-library-ui.test.mjs`: static regression coverage for script loading, dense table wiring, sticky columns, truncation, custom columns, drawer behavior, and six drawer tabs.
- Modify `index.html`: load the adapter, wire Vue state/computeds/actions, replace the current talent list shell, and re-parent the existing candidate detail markup into one drawer/full-page container.
- Modify `package.json`: include both new test files in the normal `npm test` command.

Existing user-owned changes in `supabase/talent-funnel-events.sql`, `supabase/talent-funnel-reasons.sql`, and `supabase/talent-source-channels.sql` are out of scope and must never be staged or rewritten.

---

### Task 1: Build the display-only candidate row and multi-Application adapter

**Files:**
- Create: `src/ui/talent-library-table.test.mjs`
- Create: `src/ui/talent-library-table.js`

- [ ] **Step 1: Write failing tests for Excel-compatible fields, search text, and multi-Application ordering**

Create `src/ui/talent-library-table.test.mjs` with these initial tests:

```js
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./talent-library-table.js');
const Table = globalThis.WorkBuddyTalentLibraryTable;

const companies = [
  { id: 'co-1', name: '智动未来' },
  { id: 'co-2', name: '深圳大数据研究院' },
  { id: 'co-3', name: 'XX机器人' },
];
const positions = [
  { id: 'pos-1', companyId: 'co-1', title: 'AI研究员' },
  { id: 'pos-2', companyId: 'co-2', title: '算法研究员' },
  { id: 'pos-3', companyId: 'co-3', title: '机器人算法' },
];
const candidate = {
  id: 'cand-1',
  name: '马悦驰',
  currentCompany: '博智林',
  currentTitle: '具身算法',
  city: '深圳',
  owner: '梓轩',
  education: '清华博士',
  summary: '清华博，做过 Sim2Real 和机械臂',
  skills: ['机器人', '强化学习'],
  tags: ['具身智能'],
  directions: ['机器人算法'],
  createdAt: '2026-08-10T02:00:00.000Z',
  extraFields: {
    年龄: '36',
    '期望base地': '广州',
    '薪酬信息（月薪+奖金+股票等其他激励）': '60w',
    '期望薪酬及依据': '合理涨幅',
    '换工作动机/诉求': '希望继续深耕具身领域',
  },
  resumeVersions: [{ rawText: '清华大学 机器人 Sim2Real' }],
};

test('buildCandidateRow maps direct and extraFields values without mutating Candidate', () => {
  const before = structuredClone(candidate);
  const row = Table.buildCandidateRow({ candidate, applications: [], positions, companies, stageLabel: value => value });
  assert.equal(row.age, '36');
  assert.equal(row.currentBase, '深圳');
  assert.equal(row.expectedBase, '广州');
  assert.equal(row.currentSalary, '60w');
  assert.equal(row.expectedSalary, '合理涨幅');
  assert.equal(row.motivation, '希望继续深耕具身领域');
  assert.equal(row.resumeSummary, '清华博，做过 Sim2Real 和机械臂');
  assert.equal(row.primaryFlow, null);
  assert.equal(row.extraFlowCount, 0);
  assert.deepEqual(candidate, before);
});

test('buildCandidateRow shows the latest active Application and +N without collapsing Candidate status', () => {
  const applications = [
    { id: 'app-1', candidateId: 'cand-1', positionId: 'pos-1', companyId: 'co-1', stage: 'recommended', updatedAt: '2026-08-10T04:00:00.000Z' },
    { id: 'app-2', candidateId: 'cand-1', positionId: 'pos-2', companyId: 'co-2', stage: 'interview_pending', updatedAt: '2026-08-12T04:00:00.000Z' },
    { id: 'app-3', candidateId: 'cand-1', positionId: 'pos-3', companyId: 'co-3', stage: 'closed', updatedAt: '2026-08-13T04:00:00.000Z' },
    { id: 'app-4', candidateId: 'cand-1', positionId: 'pos-3', companyId: 'co-3', stage: 'screening', updatedAt: '2026-08-11T04:00:00.000Z' },
  ];
  const row = Table.buildCandidateRow({ candidate, applications, positions, companies, stageLabel: value => `阶段:${value}` });
  assert.deepEqual(row.primaryFlow, {
    applicationId: 'app-2',
    positionId: 'pos-2',
    companyName: '深圳大数据研究院',
    positionTitle: '算法研究员',
    stage: 'interview_pending',
    stageLabel: '阶段:interview_pending',
    businessAt: '2026-08-12T04:00:00.000Z',
  });
  assert.equal(row.extraFlowCount, 2);
  assert.equal(row.status, candidate.status);
});

test('candidateSearchText covers schools skills tags Base extraFields and resume text', () => {
  const text = Table.candidateSearchText(candidate).toLowerCase();
  for (const term of ['清华', '机器人', '具身智能', '深圳', '广州', 'sim2real']) {
    assert.match(text, new RegExp(term.toLowerCase()));
  }
});

test('missing optional fields render as dash instead of throwing', () => {
  const row = Table.buildCandidateRow({ candidate: { id: 'empty', name: '空字段人才' }, applications: [], positions: [], companies: [] });
  for (const key of ['age', 'resumeSummary', 'currentBase', 'expectedBase', 'currentSalary', 'expectedSalary', 'motivation', 'owner', 'intakeAt']) {
    assert.equal(row[key], '-');
  }
});
```

- [ ] **Step 2: Run the focused test and verify the missing-module failure**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs
```

Expected: FAIL with `ERR_MODULE_NOT_FOUND` for `src/ui/talent-library-table.js`.

- [ ] **Step 3: Implement the UMD adapter with explicit aliases and active-flow joins**

Create `src/ui/talent-library-table.js` with this public shape and implementation:

```js
;(function initTalentLibraryTable(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorkBuddyTalentLibraryTable = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createTalentLibraryTable() {
  'use strict';

  const COLUMN_DEFINITIONS = Object.freeze([
    { key: 'name', label: '姓名', locked: true },
    { key: 'companyTitle', label: '当前公司 / 当前岗位' },
    { key: 'age', label: '年龄' },
    { key: 'education', label: '学历' },
    { key: 'resumeSummary', label: '履历摘要' },
    { key: 'currentBase', label: '当前 Base' },
    { key: 'expectedBase', label: '期望 Base' },
    { key: 'currentSalary', label: '当前薪酬' },
    { key: 'expectedSalary', label: '期望薪酬' },
    { key: 'motivation', label: '求职动机' },
    { key: 'availability', label: '到岗周期' },
    { key: 'recommendationComment', label: '推荐评语' },
    { key: 'flows', label: '目前流程' },
    { key: 'owner', label: '归属顾问' },
    { key: 'touchedAt', label: '最近触达' },
    { key: 'intakeAt', label: '入库日期' },
    { key: 'updatedAt', label: '更新时间' },
    { key: 'remark', label: '备注' },
  ]);
  const DEFAULT_COLUMN_KEYS = Object.freeze([
    'name', 'companyTitle', 'age', 'resumeSummary', 'currentBase', 'expectedBase',
    'currentSalary', 'expectedSalary', 'motivation', 'flows', 'owner', 'touchedAt', 'intakeAt',
  ]);
  const EXTRA_ALIASES = Object.freeze({
    age: ['年龄', 'age'],
    expectedBase: ['期望base地', '期望 Base', '期望base', '期望城市'],
    currentSalary: ['薪酬信息（月薪+奖金+股票等其他激励）', '当前薪酬', '薪酬'],
    expectedSalary: ['期望薪酬及依据', '期望薪酬'],
    motivation: ['换工作动机/诉求', '求职动机', '求职诉求'],
    availability: ['离职/到岗周期', '到岗周期'],
    recommendationComment: ['推荐评语', '推荐评价'],
    remark: ['备注', '说明'],
  });

  const text = value => String(value ?? '').trim();
  const display = value => text(value) || '-';
  const parseTime = value => Number.isFinite(Date.parse(value || '')) ? Date.parse(value) : Number.NEGATIVE_INFINITY;
  const indexById = rows => new Map((Array.isArray(rows) ? rows : []).map(row => [row?.id, row]));

  function extraValue(candidate, key) {
    const extras = candidate?.extraFields && typeof candidate.extraFields === 'object' ? candidate.extraFields : {};
    for (const alias of EXTRA_ALIASES[key] || []) {
      if (text(extras[alias])) return text(extras[alias]);
    }
    return '';
  }

  function candidateSearchText(candidate = {}) {
    return [
      candidate.name, candidate.currentCompany, candidate.currentTitle, candidate.city,
      candidate.education, candidate.summary, candidate.profileText,
      ...(candidate.skills || []), ...(candidate.tags || []), ...(candidate.directions || []),
      ...Object.values(candidate.extraFields || {}),
      ...(candidate.resumeVersions || []).flatMap(version => [version?.fileName, version?.rawText, version?.formattedText]),
    ].filter(Boolean).join(' ');
  }

  function applicationBusinessAt(application = {}) {
    const eventAt = (application.pipelineEvents || []).map(event => event?.occurredAt).filter(value => parseTime(value) > Number.NEGATIVE_INFINITY).sort((a, b) => parseTime(b) - parseTime(a))[0];
    return eventAt || application.stageEnteredAt || application.updatedAt || application.createdAt || '';
  }

  function activeCandidateFlows({ candidateId, applications = [], positions = [], companies = [], stageLabel = value => value } = {}) {
    const positionById = indexById(positions);
    const companyById = indexById(companies);
    return applications
      .filter(application => application?.candidateId === candidateId && !application.deletedAt && application.status !== 'archived' && application.stage !== 'closed')
      .map(application => {
        const position = positionById.get(application.positionId);
        const company = companyById.get(application.companyId || position?.companyId);
        return {
        applicationId: application.id,
        positionId: application.positionId,
          companyName: text(company?.name) || '公司已删除',
          positionTitle: text(position?.title) || '岗位已删除',
          stage: text(application.stage),
          stageLabel: text(stageLabel(application.stage)) || '未推进',
          businessAt: applicationBusinessAt(application),
        };
      })
      .sort((a, b) => parseTime(b.businessAt) - parseTime(a.businessAt));
  }

  function buildCandidateRow({ candidate = {}, applications = [], positions = [], companies = [], stageLabel } = {}) {
    const flows = activeCandidateFlows({ candidateId: candidate.id, applications, positions, companies, stageLabel });
    return {
      ...candidate,
      candidate,
      id: candidate.id,
      age: display(candidate.age || extraValue(candidate, 'age')),
      education: display(candidate.education),
      resumeSummary: display(candidate.resumeSummary || candidate.summary || candidate.profileText),
      currentBase: display(candidate.city),
      expectedBase: display(candidate.expectedBase || extraValue(candidate, 'expectedBase')),
      currentSalary: display(candidate.currentSalary || extraValue(candidate, 'currentSalary')),
      expectedSalary: display(candidate.expectedSalary || extraValue(candidate, 'expectedSalary')),
      motivation: display(candidate.motivation || extraValue(candidate, 'motivation')),
      availability: display(candidate.availability || extraValue(candidate, 'availability')),
      recommendationComment: display(candidate.recommendationComment || extraValue(candidate, 'recommendationComment')),
      remark: display(candidate.remark || extraValue(candidate, 'remark')),
      owner: display(candidate.owner),
      intakeAt: display(candidate.createdAt),
      updatedAt: display(candidate.updatedAt),
      flows,
      primaryFlow: flows[0] || null,
      extraFlowCount: Math.max(0, flows.length - 1),
      searchText: candidateSearchText(candidate),
    };
  }

  function buildRows({ candidates = [], applications = [], positions = [], companies = [], stageLabel } = {}) {
    return candidates.map(candidate => buildCandidateRow({ candidate, applications, positions, companies, stageLabel }));
  }

  return Object.freeze({
    COLUMN_DEFINITIONS, DEFAULT_COLUMN_KEYS, extraValue, candidateSearchText,
    applicationBusinessAt, activeCandidateFlows, buildCandidateRow, buildRows,
  });
});
```

- [ ] **Step 4: Run the focused tests and verify all initial cases pass**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs
```

Expected: 4 tests PASS, 0 FAIL.

- [ ] **Step 5: Commit only the adapter and its test**

```powershell
git add src/ui/talent-library-table.js src/ui/talent-library-table.test.mjs
git diff --staged --check
git commit -m "feat: add talent library row adapter"
```

Expected: commit contains only the two files above; Supabase SQL files remain unstaged.

---

### Task 2: Add reliable touch/recommendation dates, combined filters, summaries, and column persistence

**Files:**
- Modify: `src/ui/talent-library-table.test.mjs`
- Modify: `src/ui/talent-library-table.js`

- [ ] **Step 1: Add failing tests for structured dates, local-date presets, combined filters, and LocalStorage fallback**

Append these tests to `src/ui/talent-library-table.test.mjs`:

```js
test('structured touch and recommendation dates come from pipelineEvents only', () => {
  const application = {
    candidateId: 'cand-1',
    communicationLog: '2026-08-13 自由文本日期不得解析',
    pipelineEvents: [
      { toStage: 'contacted', occurredAt: '2026-08-10T02:00:00.000Z' },
      { toStage: 'recommended', occurredAt: '2026-08-11T02:00:00.000Z' },
      { toStage: 'interview_pending', occurredAt: '2026-08-12T02:00:00.000Z' },
    ],
  };
  assert.equal(Table.applicationTouchedAt(application), '2026-08-10T02:00:00.000Z');
  assert.equal(Table.applicationRecommendedAt(application), '2026-08-11T02:00:00.000Z');
  assert.equal(Table.applicationTouchedAt({ communicationLog: '2026-08-13 电话沟通' }), '');
});

test('date filters combine intake touch recommendation owner Base and stage', () => {
  const row = {
    id: 'cand-1', searchText: '马悦驰 清华 机器人 广州', owner: '梓轩', status: 'open',
    education: '清华博士', currentBase: '深圳', expectedBase: '广州',
    intakeAt: '2026-08-10T02:00:00.000Z', touchedAt: '2026-08-12T02:00:00.000Z', recommendedAt: '2026-08-11T02:00:00.000Z',
    flows: [{ stage: 'interview_pending', positionId: 'pos-1' }],
  };
  const now = new Date('2026-08-13T12:00:00+08:00');
  const result = Table.filterRows([row], {
    query: '清华', owner: '梓轩', base: '广州', stage: 'interview_pending',
    intake: { preset: 'week' }, touch: { preset: 'week' }, recommendation: { preset: 'week' },
  }, now);
  assert.deepEqual(result, [row]);
  assert.deepEqual(Table.filterRows([row], { intake: { preset: 'today' } }, now), []);
});

test('custom end date includes the whole selected day', () => {
  const row = { intakeAt: '2026-08-12T15:59:59.999Z', flows: [], searchText: '' };
  assert.deepEqual(Table.filterRows([row], { intake: { preset: 'custom', from: '2026-08-12', to: '2026-08-12' } }, new Date('2026-08-13T12:00:00+08:00')), [row]);
});

test('column preferences keep locked name and recover from corrupt storage', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  assert.deepEqual(Table.saveColumnKeys(storage, ['flows', 'age']), ['name', 'age', 'flows']);
  assert.deepEqual(Table.loadColumnKeys(storage), ['name', 'age', 'flows']);
  values.set(Table.COLUMN_STORAGE_KEY, '{broken');
  assert.deepEqual(Table.loadColumnKeys(storage), [...Table.DEFAULT_COLUMN_KEYS]);
});

test('summary counts filtered rows without inventing pending follow-up', () => {
  const rows = [
    { intakeAt: '2026-08-10T02:00:00.000Z', touchedAt: '2026-08-12T02:00:00.000Z' },
    { intakeAt: '2026-07-01T02:00:00.000Z', touchedAt: '-' },
  ];
  assert.deepEqual(Table.summarizeRows(rows, new Date('2026-08-13T12:00:00+08:00')), { total: 2, weekIntake: 1, weekTouched: 1 });
});
```

- [ ] **Step 2: Run the focused test and verify missing-function failures**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs
```

Expected: original tests PASS; new tests FAIL because `applicationTouchedAt`, `filterRows`, `loadColumnKeys`, and related exports do not exist.

- [ ] **Step 3: Extend the adapter with structured timestamps and local-calendar ranges**

Add the following constants and functions inside `createTalentLibraryTable()` before its return:

```js
  const COLUMN_STORAGE_KEY = 'wb_talent_library_columns_v1';
  const TOUCH_STAGES = new Set(['contacted', 'responded']);

  function eventAt(application, predicate, pick = 'last') {
    const values = (application?.pipelineEvents || [])
      .filter(predicate)
      .map(event => event?.occurredAt)
      .filter(value => parseTime(value) > Number.NEGATIVE_INFINITY)
      .sort((a, b) => parseTime(a) - parseTime(b));
    return pick === 'first' ? values[0] || '' : values.at(-1) || '';
  }

  function applicationTouchedAt(application) {
    return eventAt(application, event => event?.type === 'communication' || TOUCH_STAGES.has(event?.toStage));
  }

  function applicationRecommendedAt(application) {
    return eventAt(application, event => event?.toStage === 'recommended', 'first');
  }

  function candidateEventDate(applications, candidateId, resolver, pick = 'last') {
    const values = (applications || [])
      .filter(application => application?.candidateId === candidateId && !application.deletedAt && application.status !== 'archived')
      .map(resolver)
      .filter(value => parseTime(value) > Number.NEGATIVE_INFINITY)
      .sort((a, b) => parseTime(a) - parseTime(b));
    return pick === 'first' ? values[0] || '' : values.at(-1) || '';
  }

  function startOfLocalDay(date) {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function rangeForDateFilter(filter = {}, now = new Date()) {
    const preset = text(filter.preset || 'all');
    if (!preset || preset === 'all') return null;
    const today = startOfLocalDay(now);
    if (preset === 'today') return [today, new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)];
    if (preset === 'week') {
      const mondayOffset = (today.getDay() + 6) % 7;
      const start = new Date(today.getFullYear(), today.getMonth(), today.getDate() - mondayOffset);
      return [start, new Date(start.getFullYear(), start.getMonth(), start.getDate() + 7)];
    }
    if (preset === 'month') {
      return [new Date(today.getFullYear(), today.getMonth(), 1), new Date(today.getFullYear(), today.getMonth() + 1, 1)];
    }
    if (preset === 'custom' && filter.from && filter.to) {
      const from = new Date(`${filter.from}T00:00:00`);
      const to = new Date(`${filter.to}T00:00:00`);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) return ['invalid', 'invalid'];
      return [from, new Date(to.getFullYear(), to.getMonth(), to.getDate() + 1)];
    }
    return ['invalid', 'invalid'];
  }

  function matchesDateFilter(value, filter, now) {
    const range = rangeForDateFilter(filter, now);
    if (!range) return true;
    const time = parseTime(value);
    if (range[0] === 'invalid' || time === Number.NEGATIVE_INFINITY) return false;
    return time >= range[0].getTime() && time < range[1].getTime();
  }

  function filterRows(rows = [], filters = {}, now = new Date()) {
    const query = text(filters.query).toLowerCase();
    return rows.filter(row => {
      if (query && !text(row.searchText).toLowerCase().includes(query)) return false;
      if (filters.owner && filters.owner !== 'all' && !text(row.owner).split(/[、,，/／|\n;；]+/).map(text).includes(text(filters.owner))) return false;
      if (filters.status && filters.status !== 'all' && row.status !== filters.status) return false;
      if (filters.base && filters.base !== 'all' && !`${text(row.currentBase)} ${text(row.expectedBase)}`.toLowerCase().includes(text(filters.base).toLowerCase())) return false;
      if (filters.education && filters.education !== 'all' && !text(row.education).toLowerCase().includes(text(filters.education).toLowerCase())) return false;
      if (filters.stage && filters.stage !== 'all' && !(row.flows || []).some(flow => flow.stage === filters.stage)) return false;
      if (filters.positionId && filters.positionId !== 'all' && !(row.flows || []).some(flow => flow.positionId === filters.positionId)) return false;
      if (!matchesDateFilter(row.intakeAt, filters.intake, now)) return false;
      if (!matchesDateFilter(row.touchedAt, filters.touch, now)) return false;
      if (!matchesDateFilter(row.recommendedAt, filters.recommendation, now)) return false;
      return true;
    });
  }

  function normalizedColumnKeys(keys) {
    const allowed = new Set(COLUMN_DEFINITIONS.map(column => column.key));
    const requested = new Set((Array.isArray(keys) ? keys : []).filter(key => allowed.has(key)));
    requested.add('name');
    return COLUMN_DEFINITIONS.map(column => column.key).filter(key => requested.has(key));
  }

  function loadColumnKeys(storage = globalThis.localStorage) {
    try {
      const raw = storage?.getItem(COLUMN_STORAGE_KEY);
      return raw ? normalizedColumnKeys(JSON.parse(raw)) : [...DEFAULT_COLUMN_KEYS];
    } catch {
      return [...DEFAULT_COLUMN_KEYS];
    }
  }

  function saveColumnKeys(storage = globalThis.localStorage, keys = DEFAULT_COLUMN_KEYS) {
    const normalized = normalizedColumnKeys(keys);
    try { storage?.setItem(COLUMN_STORAGE_KEY, JSON.stringify(normalized)); } catch {}
    return normalized;
  }

  function summarizeRows(rows = [], now = new Date()) {
    return {
      total: rows.length,
      weekIntake: rows.filter(row => matchesDateFilter(row.intakeAt, { preset: 'week' }, now)).length,
      weekTouched: rows.filter(row => matchesDateFilter(row.touchedAt, { preset: 'week' }, now)).length,
    };
  }
```

In `buildCandidateRow()`, calculate the structured dates and expose them:

```js
    const touchedAt = candidateEventDate(applications, candidate.id, applicationTouchedAt, 'last');
    const recommendedAt = candidateEventDate(applications, candidate.id, applicationRecommendedAt, 'first');
```

Then set these row properties:

```js
      touchedAt: display(touchedAt),
      recommendedAt: display(recommendedAt),
```

Export the new public functions and constant in the final `Object.freeze(...)`:

```js
    COLUMN_STORAGE_KEY, applicationTouchedAt, applicationRecommendedAt,
    rangeForDateFilter, matchesDateFilter, filterRows,
    normalizedColumnKeys, loadColumnKeys, saveColumnKeys, summarizeRows,
```

- [ ] **Step 4: Run the adapter tests and verify all cases pass**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs
```

Expected: 9 tests PASS, 0 FAIL.

- [ ] **Step 5: Commit the date/filter/preference increment**

```powershell
git add src/ui/talent-library-table.js src/ui/talent-library-table.test.mjs
git diff --staged --check
git commit -m "feat: filter talent rows by workflow dates"
```

---

### Task 3: Wire the adapter into Vue without changing business entities

**Files:**
- Create: `src/ui/talent-library-ui.test.mjs`
- Modify: `index.html:71-115`
- Modify: `index.html:11088-11110`
- Modify: `index.html:11480-11620`
- Modify: `index.html:24422-24447`
- Modify: `package.json:8-11`

- [ ] **Step 1: Write failing static UI tests for script loading, computed rows, and exposed state**

Create `src/ui/talent-library-ui.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const PACKAGE = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));

test('talent library adapter loads before the Vue composition root uses it', () => {
  assert.match(HTML, /src\/ui\/talent-library-table\.js\?v=20260813-talenttable1/);
  assert.match(HTML, /const TalentLibrary = window\.WorkBuddyTalentLibraryTable/);
});

test('talent rows join visible Applications without writing Candidate pipeline state', () => {
  assert.match(HTML, /TalentLibrary\.buildRows\(\{[\s\S]*applications: visibleApplications\.value/);
  assert.match(HTML, /TalentLibrary\.filterRows\(/);
  assert.doesNotMatch(HTML, /candidate\.(?:stage|pipelineStage)\s*=/);
});

test('talent filter and column state are exposed to the template', () => {
  assert.match(HTML, /const talentLibraryFilters = reactive\(/);
  assert.match(HTML, /const talentLibraryColumnKeys = ref\(TalentLibrary\.loadColumnKeys/);
  assert.match(HTML, /talentLibraryFilters, talentLibraryColumnKeys, talentLibraryColumns/);
});

test('normal npm test includes both talent library regressions', () => {
  assert.match(PACKAGE.scripts.test, /src\/ui\/talent-library-table\.test\.mjs/);
  assert.match(PACKAGE.scripts.test, /src\/ui\/talent-library-ui\.test\.mjs/);
});
```

- [ ] **Step 2: Run the UI test and verify all assertions fail**

Run:

```powershell
node --test src/ui/talent-library-ui.test.mjs
```

Expected: FAIL because the new script, state, and package test entries do not exist.

- [ ] **Step 3: Load the adapter and define Vue state**

Add this script after `workbench-owners.js` in `index.html`:

```html
  <script src="./src/ui/talent-library-table.js?v=20260813-talenttable1"></script>
```

Near the other module aliases in the Vue setup, add:

```js
    const TalentLibrary = window.WorkBuddyTalentLibraryTable;
```

After `candidateFilters`, add:

```js
    const talentLibraryFilters = reactive({
      base: '', positionId: 'all', stage: 'all', education: 'all',
      intake: { preset: 'all', from: '', to: '' },
      touch: { preset: 'all', from: '', to: '' },
      recommendation: { preset: 'all', from: '', to: '' },
    });
    const talentLibraryColumnKeys = ref(TalentLibrary.loadColumnKeys(window.localStorage));
    const talentLibraryColumnsOpen = ref(false);
    const candidateRowMenuId = ref('');
```

- [ ] **Step 4: Replace the candidate-list computed chain with display rows**

Replace the current `filteredWorkbenchCandidates` and `pagedWorkbenchCandidates` definitions with:

```js
    const candidateSourceRows = computed(() => WorkbenchV2.filterCandidatesByCategory(
      WorkbenchV2.filterCandidates(workbenchV2.candidates, { ...candidateFilters, query: '' }),
      talentCategories.value,
      candidateFilters.category,
    ));
    const talentLibraryRows = computed(() => TalentLibrary.buildRows({
      candidates: candidateSourceRows.value,
      applications: visibleApplications.value,
      positions: workbenchV2.positions,
      companies: workbenchV2.companies,
      stageLabel: candidatePipelineLabel,
    }));
    const filteredWorkbenchCandidates = computed(() => sortByRecentUpdate(TalentLibrary.filterRows(
      talentLibraryRows.value,
      {
        ...talentLibraryFilters,
        query: candidateFilters.query,
        owner: candidateFilters.owner,
        status: candidateFilters.status,
      },
    )));
    const pagedWorkbenchCandidates = computed(() => paginate(filteredWorkbenchCandidates.value, candidatePage.value, PAGE_SIZE));
    const talentLibraryColumns = computed(() => TalentLibrary.COLUMN_DEFINITIONS.filter(column => talentLibraryColumnKeys.value.includes(column.key)));
    const talentLibraryColumnSet = computed(() => new Set(talentLibraryColumnKeys.value));
    const talentLibrarySummary = computed(() => TalentLibrary.summarizeRows(filteredWorkbenchCandidates.value));
    function setTalentLibraryColumn(key, checked) {
      const next = new Set(talentLibraryColumnKeys.value);
      if (checked) next.add(key); else next.delete(key);
      talentLibraryColumnKeys.value = TalentLibrary.saveColumnKeys(window.localStorage, [...next]);
    }
```

Do not write any row-derived values back into `workbenchV2.candidates` or `workbenchV2.applications`.

- [ ] **Step 5: Expose the new state/actions and add tests to the normal suite**

Add the following names to the Vue setup return object next to the existing candidate list exports:

```js
      talentLibraryFilters, talentLibraryColumnKeys, talentLibraryColumns,
      talentLibraryColumnSet, talentLibraryColumnsOpen, talentLibrarySummary,
      candidateRowMenuId, setTalentLibraryColumn,
```

Add both test paths to the `test` script in `package.json` immediately after `src/ui/list-performance.test.mjs`:

```text
src/ui/talent-library-table.test.mjs src/ui/talent-library-ui.test.mjs
```

- [ ] **Step 6: Run focused and existing Workbench tests**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs src/ui/talent-library-ui.test.mjs src/workbench-v2.test.mjs src/ui/candidate-core-editor.test.mjs src/services/application-visibility.test.mjs src/services/pipeline-core.test.mjs
```

Expected: all tests PASS and Candidate/Application model tests remain unchanged.

- [ ] **Step 7: Commit the Vue data wiring**

```powershell
git add index.html package.json src/ui/talent-library-ui.test.mjs
git diff --staged --check
git commit -m "feat: wire talent worktable data into Vue"
```

---

### Task 4: Replace the talent page with a compact filter bar and configurable dense table

**Files:**
- Modify: `src/ui/talent-library-ui.test.mjs`
- Modify: `index.html:135-170`
- Modify: `index.html:4275-4290`

- [ ] **Step 1: Add failing static tests for one search box, compact statistics, sticky columns, truncation, dynamic columns, and restrained row actions**

Append to `src/ui/talent-library-ui.test.mjs`:

```js
test('talent list uses one search box and compact filter controls', () => {
  const section = HTML.match(/data-talent-library-list[\s\S]*?data-talent-library-list-end/)?.[0] || '';
  assert.equal((section.match(/v-model="candidateFilters\.query"/g) || []).length, 1);
  assert.match(section, /当前结果.*talentLibrarySummary\.total/);
  assert.match(section, /本周入库.*talentLibrarySummary\.weekIntake/);
  assert.match(section, /本周已触达.*talentLibrarySummary\.weekTouched/);
  assert.doesNotMatch(section, /人才总数[\s\S]*当前推进中[\s\S]*可看机会[\s\S]*已入职/);
  assert.doesNotMatch(section, /云端全文搜索结果/);
});

test('talent table renders approved columns with sticky name and two-line clamping', () => {
  assert.match(HTML, /class="wb-talent-table-name-cell/);
  assert.match(HTML, /\.wb-talent-table-name-cell\s*\{[^}]*position:\s*sticky[^}]*left:\s*0/s);
  assert.match(HTML, /\.wb-talent-cell-clamp\s*\{[^}]*-webkit-line-clamp:\s*2/s);
  assert.match(HTML, /talentLibraryColumnSet\.has\('expectedSalary'\)/);
  assert.match(HTML, /candidate\.primaryFlow/);
  assert.match(HTML, /candidate\.extraFlowCount/);
});

test('custom columns and restrained row action menu are wired', () => {
  assert.match(HTML, /@click="talentLibraryColumnsOpen = !talentLibraryColumnsOpen"/);
  assert.match(HTML, /@change="setTalentLibraryColumn\(column\.key, \$event\.target\.checked\)"/);
  assert.match(HTML, /@click="candidateRowMenuId = candidateRowMenuId === candidate\.id \? '' : candidate\.id"/);
  assert.match(HTML, />···</);
});
```

- [ ] **Step 2: Run the UI test and verify the new layout assertions fail**

Run:

```powershell
node --test src/ui/talent-library-ui.test.mjs
```

Expected: existing wiring tests PASS; new table/layout tests FAIL.

- [ ] **Step 3: Add focused talent-table CSS without changing global card styles**

Add these rules near the current candidate-page styles in `index.html`:

```css
    .wb-talent-table-shell { border: 1px solid #e2e8f0; border-radius: 12px; background: #fff; overflow: auto; }
    .wb-talent-table { min-width: 1540px; width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
    .wb-talent-table th { position: sticky; top: 0; z-index: 5; height: 40px; background: #f8fafc; color: #64748b; font-size: 12px; font-weight: 600; text-align: left; border-bottom: 1px solid #e2e8f0; padding: 7px 10px; }
    .wb-talent-table td { height: 50px; padding: 6px 10px; border-bottom: 1px solid #f1f5f9; vertical-align: middle; color: #334155; font-size: 13px; }
    .wb-talent-table tbody tr:hover td { background: #f0fdf8; }
    .wb-talent-table-name-cell { position: sticky; left: 0; z-index: 4; width: 120px; background: #fff; box-shadow: 1px 0 0 #e2e8f0; }
    .wb-talent-table th.wb-talent-table-name-cell { z-index: 7; background: #f8fafc; }
    .wb-talent-table tbody tr:hover .wb-talent-table-name-cell { background: #f0fdf8; }
    .wb-talent-cell-clamp { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; line-height: 18px; max-height: 36px; }
    .wb-talent-table-action-cell { position: sticky; right: 0; z-index: 4; width: 54px; background: #fff; box-shadow: -1px 0 0 #e2e8f0; }
    .wb-talent-filter-bar select, .wb-talent-filter-bar input { min-height: 34px; }
```

- [ ] **Step 4: Replace the talent page header/cards/filter/cloud block/table with the approved compact structure**

In the candidate-list block, add `data-talent-library-list` to the outer list container and a hidden `<span data-talent-library-list-end hidden></span>` before it closes. Replace the two search boxes, four KPI cards, large filter card, standalone cloud results block, and grid rows with:

```html
          <div data-talent-library-list class="max-w-[1800px] mx-auto space-y-3">
            <div class="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
              <div><h1 class="text-2xl font-bold text-slate-900">人才库</h1><p class="mt-1 text-sm text-slate-500">增强版人才工作表 · 快速浏览、比较和推进</p></div>
              <div class="flex flex-wrap items-center gap-2">
                <div class="relative">
                  <button type="button" @click="talentLibraryColumnsOpen = !talentLibraryColumnsOpen" class="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">自定义列</button>
                  <div v-if="talentLibraryColumnsOpen" class="absolute right-0 top-full z-30 mt-2 max-h-80 w-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                    <label v-for="column in TalentLibrary.COLUMN_DEFINITIONS" :key="column.key" class="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input type="checkbox" :checked="talentLibraryColumnSet.has(column.key)" :disabled="column.locked" @change="setTalentLibraryColumn(column.key, $event.target.checked)">
                      <span>{{ column.label }}</span>
                    </label>
                  </div>
                </div>
                <button v-if="canWrite" type="button" @click="openTalentIntake" class="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white">＋ 新增人才</button>
              </div>
            </div>
            <div class="flex flex-col gap-2 rounded-xl border border-slate-200 bg-white p-3">
              <input v-model="candidateFilters.query" @input="syncUnifiedTalentSearch" @keyup.enter="runUnifiedTalentSearch" aria-label="搜索姓名、公司、岗位、学校、技能、标签和 Base" type="search" placeholder="搜索姓名、公司、岗位、学校、技能、标签、Base…" class="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <div class="wb-talent-filter-bar flex flex-wrap items-center gap-2">
                <select v-model="talentLibraryFilters.intake.preset" aria-label="按入库时间筛选" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="all">全部入库时间</option><option value="today">今日入库</option><option value="week">本周入库</option><option value="month">本月入库</option><option value="custom">自定义入库</option></select>
                <select v-model="talentLibraryFilters.touch.preset" aria-label="按触达时间筛选" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="all">全部触达时间</option><option value="today">今日触达</option><option value="week">本周触达</option><option value="month">本月触达</option><option value="custom">自定义触达</option></select>
                <select v-model="talentLibraryFilters.recommendation.preset" aria-label="按推荐时间筛选" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="all">全部推荐时间</option><option value="today">今日推荐</option><option value="week">本周推荐</option><option value="month">本月推荐</option><option value="custom">自定义推荐</option></select>
                <template v-if="talentLibraryFilters.intake.preset === 'custom'"><input v-model="talentLibraryFilters.intake.from" type="date" aria-label="入库开始日期" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><input v-model="talentLibraryFilters.intake.to" type="date" aria-label="入库结束日期" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"></template>
                <template v-if="talentLibraryFilters.touch.preset === 'custom'"><input v-model="talentLibraryFilters.touch.from" type="date" aria-label="触达开始日期" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><input v-model="talentLibraryFilters.touch.to" type="date" aria-label="触达结束日期" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"></template>
                <template v-if="talentLibraryFilters.recommendation.preset === 'custom'"><input v-model="talentLibraryFilters.recommendation.from" type="date" aria-label="推荐开始日期" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><input v-model="talentLibraryFilters.recommendation.to" type="date" aria-label="推荐结束日期" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"></template>
                <select v-model="talentLibraryFilters.positionId" aria-label="按推进岗位筛选" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="all">全部岗位</option><option v-for="position in workbenchV2.positions" :key="position.id" :value="position.id">{{ position.title }}</option></select>
                <input v-model.trim="talentLibraryFilters.base" aria-label="按 Base 筛选" placeholder="Base" class="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm">
                <select v-model="candidateFilters.owner" aria-label="按归属顾问筛选" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="all">全部归属顾问</option><option v-for="owner in workbenchOwners" :key="owner" :value="owner">{{ owner }}</option></select>
                <select v-model="talentLibraryFilters.stage" aria-label="按当前流程筛选" class="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"><option value="all">全部流程</option><option v-for="stage in workbenchApplicationStages" :key="stage" :value="stage">{{ candidatePipelineLabel(stage) }}</option></select>
                <span class="ml-auto text-xs text-slate-500">当前结果 <b class="text-slate-900">{{ talentLibrarySummary.total }}</b> 人 · 本周入库 <b class="text-slate-900">{{ talentLibrarySummary.weekIntake }}</b> · 本周已触达 <b class="text-slate-900">{{ talentLibrarySummary.weekTouched }}</b></span>
              </div>
            </div>
            <div class="wb-talent-table-shell">
              <table class="wb-talent-table" aria-label="人才库候选人列表">
                <thead><tr><th v-if="canWrite" class="w-10"><input type="checkbox" aria-label="全选当前页候选人" :checked="allVisibleCandidatesSelected" @change="toggleAllVisibleCandidates($event.target.checked)"></th><th class="wb-talent-table-name-cell">姓名</th><th v-if="talentLibraryColumnSet.has('companyTitle')">当前公司 / 岗位</th><th v-if="talentLibraryColumnSet.has('age')">年龄</th><th v-if="talentLibraryColumnSet.has('education')">学历</th><th v-if="talentLibraryColumnSet.has('resumeSummary')">履历摘要</th><th v-if="talentLibraryColumnSet.has('currentBase')">当前 Base</th><th v-if="talentLibraryColumnSet.has('expectedBase')">期望 Base</th><th v-if="talentLibraryColumnSet.has('currentSalary')">当前薪酬</th><th v-if="talentLibraryColumnSet.has('expectedSalary')">期望薪酬</th><th v-if="talentLibraryColumnSet.has('motivation')">求职动机</th><th v-if="talentLibraryColumnSet.has('flows')">当前流程</th><th v-if="talentLibraryColumnSet.has('owner')">归属顾问</th><th v-if="talentLibraryColumnSet.has('touchedAt')">最近触达</th><th v-if="talentLibraryColumnSet.has('intakeAt')">入库日期</th><th class="wb-talent-table-action-cell">操作</th></tr></thead>
                <tbody>
                  <tr v-for="candidate in pagedWorkbenchCandidates.items" :key="candidate.id">
                    <td v-if="canWrite"><input type="checkbox" aria-label="选择候选人" :checked="selectedCandidateIds.includes(candidate.id)" @change="toggleCandidateSelection(candidate.id, $event.target.checked)"></td>
                    <td class="wb-talent-table-name-cell"><button type="button" @click="openCandidateDrawer(candidate.id)" class="font-semibold text-emerald-800 hover:underline">{{ candidate.name || '未命名候选人' }}</button><small class="block text-slate-400">{{ candidate.status || 'open' }}</small></td>
                    <td v-if="talentLibraryColumnSet.has('companyTitle')"><span>{{ candidate.currentCompany || '-' }}</span><small class="block text-slate-400">{{ candidate.currentTitle || '-' }}</small></td>
                    <td v-if="talentLibraryColumnSet.has('age')">{{ candidate.age }}</td><td v-if="talentLibraryColumnSet.has('education')"><span class="wb-talent-cell-clamp" :title="candidate.education">{{ candidate.education }}</span></td><td v-if="talentLibraryColumnSet.has('resumeSummary')"><span class="wb-talent-cell-clamp" :title="candidate.resumeSummary">{{ candidate.resumeSummary }}</span></td>
                    <td v-if="talentLibraryColumnSet.has('currentBase')">{{ candidate.currentBase }}</td><td v-if="talentLibraryColumnSet.has('expectedBase')">{{ candidate.expectedBase }}</td><td v-if="talentLibraryColumnSet.has('currentSalary')" :title="candidate.currentSalary">{{ candidate.currentSalary }}</td><td v-if="talentLibraryColumnSet.has('expectedSalary')" :title="candidate.expectedSalary">{{ candidate.expectedSalary }}</td>
                    <td v-if="talentLibraryColumnSet.has('motivation')"><span class="wb-talent-cell-clamp" :title="candidate.motivation">{{ candidate.motivation }}</span></td>
                    <td v-if="talentLibraryColumnSet.has('flows')"><button v-if="candidate.primaryFlow" type="button" @click="openApplicationDetail(candidate.primaryFlow.applicationId)" class="text-left text-emerald-700"><span class="wb-talent-cell-clamp">{{ candidate.primaryFlow.companyName }} · {{ candidate.primaryFlow.stageLabel }}</span></button><span v-else>-</span><button v-if="candidate.extraFlowCount" type="button" @click="openCandidateDrawer(candidate.id, 'applications')" class="ml-1 rounded-full bg-emerald-50 px-1.5 py-0.5 text-xs font-semibold text-emerald-700">+{{ candidate.extraFlowCount }}</button></td>
                    <td v-if="talentLibraryColumnSet.has('owner')">{{ candidate.owner }}</td><td v-if="talentLibraryColumnSet.has('touchedAt')">{{ candidate.touchedAt === '-' ? '-' : formatBeijingDateTime(candidate.touchedAt) }}</td><td v-if="talentLibraryColumnSet.has('intakeAt')">{{ candidate.intakeAt === '-' ? '-' : candidate.intakeAt.slice(0, 10) }}</td>
                    <td class="wb-talent-table-action-cell relative"><button type="button" aria-label="候选人操作" @click="candidateRowMenuId = candidateRowMenuId === candidate.id ? '' : candidate.id" class="rounded-md px-2 py-1 text-slate-500 hover:bg-slate-100">···</button><div v-if="candidateRowMenuId === candidate.id" class="absolute right-2 top-9 z-20 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg"><button type="button" @click="candidateRowMenuId = ''; openCandidateDrawer(candidate.id)" class="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50">查看详情</button><button type="button" @click="candidateRowMenuId = ''; openCandidateDetail(candidate.id, 'matching')" class="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50">匹配岗位</button><button v-if="canWrite" type="button" @click="candidateRowMenuId = ''; openCandidateDrawer(candidate.id, 'overview')" class="w-full rounded px-2 py-1.5 text-left hover:bg-slate-50">编辑人才</button></div></td>
                  </tr>
                </tbody>
              </table>
              <p v-if="!filteredWorkbenchCandidates.length" class="py-14 text-center text-sm text-slate-400">暂无符合条件的人才</p>
            </div>
            <span data-talent-library-list-end hidden></span>
          </div>
```

Immediately after this compact block, retain the existing bulk-selection toolbar and pagination expressions unchanged. Only replace their outer spacing classes with `mt-3 flex flex-wrap items-center justify-between gap-2` so the behavior and current-page semantics stay intact.

- [ ] **Step 5: Ensure the template can reference column definitions**

Expose the existing `TalentLibrary` alias in the Vue setup return object:

```js
      TalentLibrary,
```

- [ ] **Step 6: Run the focused UI and adapter tests**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs src/ui/talent-library-ui.test.mjs src/ui/list-performance.test.mjs src/ui/candidate-core-editor.test.mjs
```

Expected: all tests PASS. Confirm the static test sees only one `candidateFilters.query` input inside the talent list markers.

- [ ] **Step 7: Build CSS and production output**

Run sequentially:

```powershell
npm run build:css
npm run build
```

Expected: both commands exit 0. Do not run them concurrently because both touch generated assets.

- [ ] **Step 8: Commit the compact worktable UI**

Stage only source and expected generated CSS files reported by `git status`; do not stage `dist/`, `.superpowers/`, or Supabase SQL files:

```powershell
git add index.html src/ui/talent-library-ui.test.mjs public/assets/workbuddy.css
git diff --staged --check
git commit -m "feat: redesign talent library as dense worktable"
```

If `public/assets/workbuddy.css` has no change, omit it from `git add`.

---

### Task 5: Reuse the existing candidate detail markup as a right-side drawer

**Files:**
- Modify: `src/ui/talent-library-ui.test.mjs`
- Modify: `index.html:4292-4460`
- Modify: `index.html:11088-11120`
- Modify: `index.html:11950-12020`
- Modify: `index.html:12670-12700`
- Modify: `index.html:24422-24447`

- [ ] **Step 1: Add failing static tests for drawer/full-page reuse and the six approved tabs**

Append to `src/ui/talent-library-ui.test.mjs`:

```js
test('candidate detail markup has one tree with drawer and full-page modes', () => {
  assert.match(HTML, /const candidateDetailMode = ref\('full'\)/);
  assert.match(HTML, /function openCandidateDrawer\(id, tab = 'resume'\)/);
  assert.match(HTML, /candidateDetailMode\.value = 'drawer'/);
  assert.match(HTML, /candidateDetailMode === 'drawer' \? 'wb-candidate-drawer'/);
  assert.equal((HTML.match(/aria-label="候选人详情页签"/g) || []).length, 1);
});

test('drawer defaults to original resume and exposes six approved tabs', () => {
  assert.match(HTML, /openCandidateDrawer\(candidate\.id\)/);
  assert.match(HTML, /tab = 'resume'/);
  for (const label of ['原始简历', '结构化信息', '推荐记录', '面试进度', '跟进记录', 'AI分析']) {
    assert.match(HTML, new RegExp(label));
  }
  assert.match(HTML, /@click="openCandidateDetail\(selectedCandidate\.id, workbenchRoute\.tab\)"/);
});

test('drawer supports Escape and keeps resume loaders on the existing selected candidate path', () => {
  assert.match(HTML, /@keydown\.esc\.window="closeCandidateDrawer"/);
  assert.match(HTML, /ensureResumeTexts\(activeCandidateResumeVersion\.value\)/);
  assert.match(HTML, /candidate-original-file-actions\.js/);
});
```

- [ ] **Step 2: Run the UI test and verify drawer assertions fail**

Run:

```powershell
node --test src/ui/talent-library-ui.test.mjs
```

Expected: table tests PASS; drawer tests FAIL.

- [ ] **Step 3: Add drawer mode state and explicit list/full-page entry actions**

Near `workbenchRoute`, add:

```js
    const candidateDetailMode = ref('full');
```

Replace `openCandidateDetail` with these functions:

```js
    function selectCandidateDetail(id, tab) {
      workbenchNav.value = 'candidates';
      candidateCategoriesExpanded.value = false;
      Object.assign(workbenchRoute, { type: 'candidate', id, parentId: '', tab });
      if (workbenchMode.value === 'v2') aiToolbox.resumeId = id;
      void ensureResumeTexts(activeCandidateResumeVersion.value);
    }
    function openCandidateDrawer(id, tab = 'resume') {
      candidateDetailMode.value = 'drawer';
      selectCandidateDetail(id, tab);
    }
    function openCandidateDetail(id, tab = 'overview') {
      candidateDetailMode.value = 'full';
      selectCandidateDetail(id, tab);
    }
    function closeCandidateDrawer() {
      if (candidateDetailMode.value !== 'drawer') return;
      candidateDetailMode.value = 'full';
      Object.assign(workbenchRoute, { type: 'list', id: '', parentId: '', tab: 'overview' });
    }
```

Expose `candidateDetailMode`, `openCandidateDrawer`, and `closeCandidateDrawer` in the setup return object.

- [ ] **Step 4: Re-parent the existing talent list and candidate detail into one candidate branch**

Perform this as a mechanical re-parent, without copying or rewriting either large body:

1. Replace the current candidate-list `v-else-if` with `v-else-if="workbenchNav === 'candidates'"` and add `class="relative" @keydown.esc.window="closeCandidateDrawer"`.
2. Move the already-built `data-talent-library-list` block from Task 4 inside it, and set that block's condition to `v-if="workbenchRoute.type === 'list' || candidateDetailMode === 'drawer'"`.
3. Delete the old sibling `v-else-if="workbenchNav === 'candidates' && workbenchRoute.type === 'candidate'"` wrapper only; move its existing detail children unchanged into the shared branch.
4. Insert the backdrop immediately before those detail children, and wrap those same children in the mode-aware detail container below. Confirm the candidate hero, tabs, and every tab panel occur exactly once in `index.html`.

The resulting wrapper tags are:

```html
        <div v-else-if="workbenchNav === 'candidates'" class="relative" @keydown.esc.window="closeCandidateDrawer">
          <div v-if="workbenchRoute.type === 'list' || candidateDetailMode === 'drawer'" data-talent-library-list class="max-w-[1800px] mx-auto space-y-3">
            <span data-talent-library-list-end hidden></span>
          </div>

          <div v-if="workbenchRoute.type === 'candidate' && selectedCandidate && candidateDetailMode === 'drawer'" class="fixed inset-0 z-40 bg-slate-950/20" @click.self="closeCandidateDrawer"></div>
          <div
            v-if="workbenchRoute.type === 'candidate' && selectedCandidate"
            :class="candidateDetailMode === 'drawer' ? 'wb-candidate-drawer' : 'wb-v2-candidate-detail mx-auto space-y-4'"
            role="dialog"
            :aria-modal="candidateDetailMode === 'drawer' ? 'true' : undefined"
            aria-label="候选人详情"
          >
          </div>
        </div>
```

The first wrapper in this snippet represents the exact Task 4 list body between its opening tag and `<span data-talent-library-list-end hidden></span>`; during the mechanical move, preserve that body byte-for-byte. The empty detail wrapper similarly receives the current candidate hero, tabs, and panels byte-for-byte before the old sibling wrapper is removed.

Add focused drawer CSS:

```css
    .wb-candidate-drawer { position: fixed; z-index: 50; top: 0; right: 0; bottom: 0; width: min(760px, 82vw); overflow-y: auto; padding: 20px; background: #f8fafc; border-left: 1px solid #e2e8f0; box-shadow: -18px 0 42px rgba(15, 23, 42, .16); }
    @media (max-width: 760px) { .wb-candidate-drawer { width: 96vw; padding: 14px; } }
```

Replace the current back button in the shared detail markup with mode-aware controls:

```html
            <div class="flex items-center justify-between gap-3">
              <button v-if="candidateDetailMode === 'full'" @click="backToWorkbenchList" class="text-sm hover:text-emerald-700" type="button">← 返回人才库列表</button>
              <button v-else @click="closeCandidateDrawer" class="text-sm hover:text-emerald-700" type="button">× 关闭</button>
              <button v-if="candidateDetailMode === 'drawer'" @click="openCandidateDetail(selectedCandidate.id, workbenchRoute.tab)" class="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600" type="button">完整页面打开</button>
            </div>
```

- [ ] **Step 5: Make the tab list mode-aware and add an interview view without removing matching from the full page**

Add:

```js
    const candidateDetailTabs = computed(() => candidateDetailMode.value === 'drawer'
      ? [
          { id: 'resume', label: '原始简历' },
          { id: 'overview', label: '结构化信息' },
          { id: 'applications', label: '推荐记录' },
          { id: 'interviews', label: '面试进度' },
          { id: 'activity', label: '跟进记录' },
          { id: 'ai', label: 'AI分析' },
        ]
      : [
          { id: 'overview', label: '候选人概览' },
          { id: 'resume', label: '简历' },
          { id: 'matching', label: '岗位匹配' },
          { id: 'applications', label: '推进记录' },
          { id: 'interviews', label: '面试进度' },
          { id: 'ai', label: 'AI分析' },
          { id: 'activity', label: '备注与动态' },
        ]);
    const selectedCandidateInterviewApplications = computed(() => selectedCandidateApplications.value.filter(application => SG.INTERVIEW.includes(application.stage)));
```

Expose both computed values. Replace the inline tab array with `candidateDetailTabs`. Add this content branch next to the existing applications branch:

```html
          <div v-else-if="workbenchRoute.tab === 'interviews'" class="rounded-xl border border-slate-200 bg-white p-5">
            <h2 class="text-lg font-bold">面试进度</h2>
            <button v-for="application in selectedCandidateInterviewApplications" :key="application.id" type="button" @click="openApplicationDetail(application.id)" class="mt-3 flex w-full items-center justify-between rounded-lg border border-slate-200 p-4 text-left hover:bg-slate-50">
              <span><b>{{ companyById.get(application.companyId)?.name || '公司已删除' }}</b><small class="mt-1 block text-slate-400">{{ positionById.get(application.positionId)?.title || '岗位已删除' }}</small></span>
              <span class="text-sm text-emerald-700">{{ candidatePipelineLabel(application.stage) }}</span>
            </button>
            <p v-if="!selectedCandidateInterviewApplications.length" class="py-8 text-center text-sm text-slate-400">暂无面试中的流程</p>
          </div>
```

- [ ] **Step 6: Run focused candidate detail and resume tests**

Run:

```powershell
node --test src/ui/talent-library-ui.test.mjs src/ui/candidate-core-editor.test.mjs src/ui/candidate-resume-actions.test.mjs src/ui/candidate-original-file-actions.test.mjs src/services/resume-original-text-loader.test.mjs src/services/resume-original-record-loader.test.mjs
```

Expected: all tests PASS; original resume tests confirm no second loader path was introduced.

- [ ] **Step 7: Build and commit the drawer increment**

Run sequentially:

```powershell
npm run build:css
npm run build
git diff --check
git add index.html src/ui/talent-library-ui.test.mjs public/assets/workbuddy.css
git diff --staged --check
git commit -m "feat: open candidate details in reusable drawer"
```

If generated CSS is unchanged, omit it. Expected: the commit contains no database or unrelated module changes.

---

### Task 6: Final regression, browser verification, and completion report

**Files:**
- Modify only if verification reveals a scoped talent-library defect: `index.html`, `src/ui/talent-library-table.js`, or their tests

- [ ] **Step 1: Run the focused acceptance suite**

Run:

```powershell
node --test src/ui/talent-library-table.test.mjs src/ui/talent-library-ui.test.mjs src/workbench-v2.test.mjs src/ui/list-performance.test.mjs src/ui/candidate-core-editor.test.mjs src/ui/candidate-resume-actions.test.mjs src/ui/candidate-original-file-actions.test.mjs src/services/application-visibility.test.mjs src/services/pipeline-core.test.mjs
```

Expected: all tests PASS, including 0/1/3 Application, missing-field, date-boundary, owner, LocalStorage, and drawer regressions.

- [ ] **Step 2: Run the full repository tests**

Run:

```powershell
npm test
```

Expected: exit 0. If an unrelated pre-existing failure appears, reproduce it on the Task 5 base commit before classifying it as unrelated; do not change unrelated code.

- [ ] **Step 3: Build production output sequentially**

Run:

```powershell
npm run build:css
npm run build
git diff --check
```

Expected: all commands exit 0 and no new whitespace errors appear in touched lines.

- [ ] **Step 4: Start the local app and verify the real Vue runtime**

Run:

```powershell
npm run dev -- --host 127.0.0.1
```

Use the configured browser testing surface to open the printed local URL. Verify:

1. `#app` contains mounted Vue output; no raw `{{ ... }}` expressions or “页面加载失败” text remain.
2. Talent Library shows one search box, compact filters, lightweight counts, and a horizontally scrollable table.
3. Header stays sticky while scrolling; the name column stays fixed while horizontal scrolling; the action column stays at the right.
4. Long motivation/recommendation text remains two lines and rows remain approximately 44–52px.
5. A candidate with no Application shows `-`; one Application shows company/stage; three active Applications show the latest plus `+2`.
6. Missing salary/company values display `-` without console errors.
7. “本周入库”, “本周触达”, recommendation date, custom date range, and owner filters produce the expected candidate subset.
8. Custom columns hide/show optional fields and survive a hard refresh.
9. Clicking a name opens the right drawer on “原始简历”; all six tabs switch; Escape and backdrop close the drawer.
10. “完整页面打开” reuses the same candidate and active tab.
11. Browser console contains no new errors and network requests for the new adapter and existing resume modules succeed.

- [ ] **Step 5: Fix only verified in-scope defects and rerun the smallest failing check plus the full focused suite**

For each defect, first add or tighten a regression assertion in `talent-library-table.test.mjs` or `talent-library-ui.test.mjs`, confirm it fails, make the smallest code/CSS change, then rerun Step 1. Do not restyle unrelated WorkBuddy pages.

- [ ] **Step 6: Review final diff and commit any verification-only fixes**

```powershell
git status --short
git diff --stat
git diff --check
```

If verification produced changes, stage only the scoped files and commit:

```powershell
git add index.html src/ui/talent-library-table.js src/ui/talent-library-table.test.mjs src/ui/talent-library-ui.test.mjs public/assets/workbuddy.css
git diff --staged --check
git commit -m "fix: polish talent library acceptance cases"
```

Omit unchanged files. Confirm the three Supabase SQL files and `.superpowers/` remain uncommitted.

- [ ] **Step 7: Prepare the user-facing completion report**

Report:

- Exact modified files and commits.
- New page structure.
- Excel-to-WorkBuddy mapping, separated into direct, calculated, compatibility/`extraFields`, and unavailable values.
- Multi-Application ordering and exclusion rules.
- Exact date definitions and fallback behavior.
- Confirmation that no database structure changed.
- Automated test/build evidence and browser verification evidence.
- Manual acceptance steps for search, filters, custom columns, multi-flow display, and the resume drawer.

Do not claim deployment or GitHub Pages success unless push and terminal deployment verification were separately requested and completed.
