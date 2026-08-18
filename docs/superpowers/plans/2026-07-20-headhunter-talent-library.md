# Headhunter Talent Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Headhunter's talent library the single place for resume intake, categories, job matching, and target-company discovery.

**Architecture:** Keep `workbenchV2` as the only talent store. Add optional category data to the existing bundle settings and candidate records, expose pure category helpers from `src/workbench-v2.js`, and compose the existing Vue single-file UI around those helpers. Preserve file blobs, talent writes, and application-stage boundaries.

**Tech Stack:** Vue 3 global build, JavaScript, IndexedDB snapshot/blob stores, Node `node:test`.

---

### Task 1: Category domain helpers

**Files:**
- Modify: `src/workbench-v2.js`
- Modify: `src/workbench-v2.test.mjs`

- [ ] Write failing tests for normalising an empty category directory, expanding a parent to child IDs, multi-category candidate filtering, and category removal preserving the candidate.
- [ ] Run `node --test src/workbench-v2.test.mjs` and confirm the new tests fail because the helper exports do not exist.
- [ ] Add `getTalentCategories`, `getTalentCategoryPaths`, `filterCandidatesByCategory`, `assignTalentCategories`, and `removeTalentCategory` to `WorkbenchV2`; store data only in `bundle.settings.talentCategories` and optional `candidate.categoryIds`.
- [ ] Re-run the focused test file and confirm it passes.
- [ ] Commit `feat: add talent category domain helpers`.

### Task 2: Single intake modal and branding

**Files:**
- Modify: `index.html`

- [ ] Search the login/landing template for user-visible `WorkBuddy` wording and record the baseline matches.
- [ ] Change only user-visible brand wording to `Headhunter`; leave storage keys, globals and auth compatibility identifiers untouched.
- [ ] Remove the two upload items from the global create menu.
- [ ] Change every talent-library upload button and empty-state button to one `openTalentIntake` entry.
- [ ] Make that entry show a combined dialog: the existing multi-file/drop queue plus a collapsible direct-entry form backed by the existing `candidateUpload` form and save handlers.
- [ ] Confirm its file input is `multiple`, drag-and-drop calls `addBatchFiles`, and direct entry retains all original fields and paste-text parsing.
- [ ] Run the inline-script parse check and a browser smoke test; commit `feat: unify Headhunter resume intake`.

### Task 3: Category management and talent-library filtering

**Files:**
- Modify: `index.html`
- Modify: `src/workbench-v2.test.mjs`

- [ ] Add failing helper tests for selecting a parent category and deleting a category without deleting candidates or applications.
- [ ] Add reactive category state derived from `workbenchV2.settings`, and persist all category mutations with `saveWorkbenchV2()`.
- [ ] Add a category selector to the talent-library filter bar; filter `filteredWorkbenchCandidates` through the pure helper.
- [ ] Add a talent-library category-management dialog with main/subcategory add, rename, delete and ordering controls.
- [ ] Add multi-select category chips to direct entry and candidate detail.
- [ ] Verify the filter, assignment and deletion interaction in Chromium and run all unit tests; commit `feat: manage and filter talent categories`.

### Task 4: Job-match workspace

**Files:**
- Modify: `index.html`
- Modify: `src/workbench-v2.test.mjs`

- [ ] Add a failing test demonstrating that `matchCandidates` accepts an unsaved position-shaped object and does not mutate candidates.
- [ ] Add a talent-library “岗位匹配” dialog that offers an existing Workbench position or a temporary title/company/JD form and an optional category scope.
- [ ] Reuse `WorkbenchV2.matchCandidates` for results, render score/reason/gaps, and allow `createApplicationFromMatch` only when a persisted position is selected.
- [ ] Verify a temporary JD cannot create a company, position or application; verify a selected position can create exactly one application.
- [ ] Run unit tests and browser harness; commit `feat: add talent library job matching`.

### Task 5: Target-company discovery

**Files:**
- Modify: `index.html`

- [ ] Add a local normaliser for AI target-company responses that ignores empty company names and keeps only candidate IDs present in the current scoped talent list.
- [ ] Add a talent-library “目标公司挖掘” dialog using the existing DeepSeek configuration; pass skills, directions, classification, location and current company, and exclude current/history companies in the prompt.
- [ ] Render company, industry, reason and related talent; retain results in UI state until the dialog closes.
- [ ] Add an explicit “创建公司” action that calls the existing company creation path only after user action; never auto-create companies.
- [ ] Run browser smoke checks with a mocked/local AI response path and full regression tests; commit `feat: add target company discovery`.

### Task 6: Final verification

**Files:**
- Modify only if a verification failure requires a targeted fix.

- [ ] Run `node --test src/workbench-v2.test.mjs`.
- [ ] Run existing editor/resume tests and parse every inline script in `index.html`.
- [ ] Run the Chromium harness against a fresh profile: load, preview gate, single direct entry, multi-file queue, category filtering, matching and target-company dialog.
- [ ] Inspect the final diff for accidental schema/store/auth-key changes; commit any final targeted fix separately.

