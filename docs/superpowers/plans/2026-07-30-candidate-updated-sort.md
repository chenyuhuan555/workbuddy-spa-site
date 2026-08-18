# Candidate Recent-Update Sorting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the candidate list show the most recently updated candidate first, including a newly uploaded resume.

**Architecture:** Add a non-mutating reusable sorter to the existing list-performance module. Apply it to the fully filtered candidate collection before the existing 50-item pagination step, leaving storage, filters, and other lists unchanged.

**Tech Stack:** Browser JavaScript IIFE, Vue 3 computed state, Node built-in test runner.

---

### Task 1: Sort filtered candidates before pagination

**Files:**
- Modify: `src/ui/list-performance.js`
- Modify: `src/ui/list-performance.test.mjs`
- Modify: `src/workbench-v2.test.mjs`
- Modify: `index.html`

- [ ] **Step 1: Write failing sorter tests**

Import `sortByRecentUpdate` and add a test with candidates whose `updatedAt` values are new, old, missing, invalid, and equal. Require descending order, `createdAt` fallback, ID tie-breaking, and unchanged source order.

```js
const source = [
  { id: 'old', updatedAt: '2026-07-01T00:00:00.000Z' },
  { id: 'new', updatedAt: '2026-07-30T00:00:00.000Z' },
  { id: 'created', createdAt: '2026-07-20T00:00:00.000Z' },
  { id: 'invalid', updatedAt: 'not-a-date' },
];
assert.deepEqual(sortByRecentUpdate(source).map(item => item.id), ['new', 'created', 'old', 'invalid']);
assert.deepEqual(source.map(item => item.id), ['old', 'new', 'created', 'invalid']);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```powershell
node --test src/ui/list-performance.test.mjs
```

Expected: failure because `sortByRecentUpdate` is not exported.

- [ ] **Step 3: Implement the minimal non-mutating sorter**

Add to `src/ui/list-performance.js`:

```js
function sortByRecentUpdate(source) {
  const timestamp = item => {
    const value = Date.parse(item?.updatedAt || item?.createdAt || '');
    return Number.isFinite(value) ? value : Number.NEGATIVE_INFINITY;
  };
  return [...(Array.isArray(source) ? source : [])].sort((a, b) => {
    const difference = timestamp(b) - timestamp(a);
    return difference || String(a?.id || '').localeCompare(String(b?.id || ''));
  });
}
```

Export it from `WorkBuddyListPerformance`.

- [ ] **Step 4: Add the page integration contract and verify RED**

In `src/workbench-v2.test.mjs`, assert that `filteredWorkbenchCandidates` wraps the completed category-filter result with `sortByRecentUpdate`, and that `pagedWorkbenchCandidates` still paginates that sorted computed value.

Run:

```powershell
node --test src/workbench-v2.test.mjs
```

Expected: failure because the page has not connected the sorter.

- [ ] **Step 5: Apply sorting after filters and before pagination**

Destructure `sortByRecentUpdate` from `WorkBuddyListPerformance`. Change `filteredWorkbenchCandidates` so the two existing filters run first and their result is passed to `sortByRecentUpdate`. Keep this line unchanged:

```js
const pagedWorkbenchCandidates = computed(() => paginate(filteredWorkbenchCandidates.value, candidatePage.value, PAGE_SIZE));
```

- [ ] **Step 6: Run complete verification**

Run:

```powershell
node --test src/ui/list-performance.test.mjs src/workbench-v2.test.mjs
npm test
npm run build
git diff --check
```

Expected: all tests pass, production build succeeds, and no whitespace errors are reported.

- [ ] **Step 7: Commit**

```powershell
git add src/ui/list-performance.js src/ui/list-performance.test.mjs src/workbench-v2.test.mjs index.html
git commit -m "fix: sort candidates by recent update"
```
