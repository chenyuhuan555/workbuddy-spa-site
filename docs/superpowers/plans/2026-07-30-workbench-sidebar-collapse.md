# Workbench Sidebar Collapse Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an accessible desktop toggle that collapses the WorkBuddy V2 navigation to a 72px icon rail while every page refresh starts expanded.

**Architecture:** Keep the feature inside the existing single-file Vue application: one non-persisted `ref(false)` controls a sidebar class and button attributes, while focused CSS handles desktop, reduced-motion, and existing mobile breakpoints. A dedicated static contract test protects the state, template, accessibility, and responsive styling without introducing a new runtime module or storage field.

**Tech Stack:** Vue 3 global build, HTML/CSS, Node.js built-in test runner, parse5-based existing accessibility checks, Tailwind static CSS build, Vite development server.

---

## File map

- Create `src/ui/sidebar-collapse.test.mjs`: static regression contract for default state, non-persistence, template accessibility, 72px desktop mode, 84px mobile behavior, and reduced-motion handling.
- Modify `package.json`: include the new test in the standard `npm test` command.
- Modify `index.html`: add the transient Vue state, accessible toggle markup, explicit label wrappers, collapsed styles, responsive overrides, and state exposure to the template.
- Do not modify storage, save coordination, Supabase synchronization, navigation data, or routing files.

### Task 1: Establish the failing sidebar contract

**Files:**
- Create: `src/ui/sidebar-collapse.test.mjs`
- Modify: `package.json:9-19`
- Reference: `index.html:3357-3401`
- Reference: `index.html:3827-3842`
- Reference: `index.html:3905-3962`
- Reference: `index.html:10441-10454`
- Reference: `index.html:22879-22883`

- [ ] **Step 1: Add the new test file with exact behavioral contracts**

Create `src/ui/sidebar-collapse.test.mjs` with:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('工作台侧栏每次加载默认展开且不持久化状态', () => {
  assert.match(html, /const workbenchSidebarCollapsed = ref\(false\);/);
  assert.doesNotMatch(html, /(?:localStorage|sessionStorage)[^;\n]*workbenchSidebarCollapsed/);
  assert.doesNotMatch(html, /workbenchSidebarCollapsed[^;\n]*(?:localSave|schedulePush|saveWorkbenchV2)/);
});

test('侧栏开关和图标导航具有完整的可访问语义', () => {
  assert.match(html, /<nav id="workbench-main-navigation"[^>]*:class="[^\"]*is-collapsed[^\"]*workbenchSidebarCollapsed[^\"]*"/);
  assert.match(html, /<button[^>]*class="wb-v2-sidebar-toggle[^\"]*"[^>]*type="button"[^>]*aria-controls="workbench-main-navigation"[^>]*:aria-expanded="!workbenchSidebarCollapsed"[^>]*:aria-label="workbenchSidebarCollapsed \? '展开导航栏' : '收起导航栏'"/);
  assert.match(html, /:title="workbenchSidebarCollapsed \? item\.label : ''"/);
  assert.match(html, /<span class="wb-v2-sidebar-label">\{\{ item\.label \}\}<\/span>/);
  assert.match(html, /workbenchMode, workbenchNav, workbenchSidebarCollapsed, workbenchNavItems/);
});

test('侧栏样式提供 72px 桌面模式并保留现有 84px 窄屏模式', () => {
  assert.match(html, /nav\.wb-v2-sidebar\.is-collapsed\s*\{[^}]*width:\s*72px\s*!important;/s);
  assert.match(html, /\.wb-v2-sidebar\.is-collapsed[^}]*\.wb-v2-sidebar-label[^}]*display:\s*none;/s);
  assert.match(html, /@media\s*\(max-width:\s*820px\)[\s\S]*?nav\.wb-v2-sidebar\.is-collapsed\s*\{[^}]*width:\s*84px\s*!important;/);
  assert.match(html, /@media\s*\(max-width:\s*820px\)[\s\S]*?\.wb-v2-sidebar-toggle\s*\{[^}]*display:\s*none;/);
  assert.match(html, /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?\.wb-v2-sidebar\s*\{[^}]*transition:\s*none/);
});
```

- [ ] **Step 2: Register the new test in the standard suite**

In `package.json`, append the new file to the existing `test` script, keeping every current test:

```json
"test": "node --test src/workbench-v2.test.mjs src/storage/indexeddb-cache.test.mjs src/batch-upload.test.mjs src/editor-deepseek-settings.test.mjs src/ui/list-performance.test.mjs src/ui/candidate-core-editor.test.mjs src/ui/sidebar-collapse.test.mjs src/services/save-coordinator.test.mjs src/services/resume-ai-processing.test.mjs src/accessibility-static.test.mjs src/production-build.test.mjs"
```

- [ ] **Step 3: Run the focused test and verify the feature is absent**

Run:

```powershell
node --test src/ui/sidebar-collapse.test.mjs
```

Expected: FAIL. The output must report missing `workbenchSidebarCollapsed`, missing toggle markup, or missing collapsed CSS. A syntax error in the test itself is not an acceptable failure.

### Task 2: Implement the minimal accessible collapse behavior

**Files:**
- Modify: `index.html:3357-3401`
- Modify: `index.html:3827-3842`
- Modify: `index.html:3905-3962`
- Modify: `index.html:10441-10454`
- Modify: `index.html:22879-22883`
- Test: `src/ui/sidebar-collapse.test.mjs`
- Test: `src/accessibility-static.test.mjs`

- [ ] **Step 1: Add desktop collapse, label, toggle, and reduced-motion styles**

Extend the existing sidebar CSS immediately after `.wb-v2-workspace .wb-v2-sidebar` and its current section rules. Use these selectors and values:

```css
.wb-v2-workspace .wb-v2-sidebar {
  transition: width 180ms ease;
}

.wb-v2-workspace nav.wb-v2-sidebar.is-collapsed {
  width: 72px !important;
}

.wb-v2-workspace .wb-v2-sidebar-brand {
  position: relative;
}

.wb-v2-workspace .wb-v2-sidebar-toggle {
  position: absolute;
  top: 38px;
  right: -14px;
  z-index: 2;
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--wb-v2-border);
  border-radius: 9999px;
  background: #fff;
  color: #277653;
  box-shadow: 0 4px 12px rgba(38, 82, 61, 0.12);
  transition: color 150ms ease, box-shadow 150ms ease, transform 150ms ease;
}

.wb-v2-workspace .wb-v2-sidebar-toggle:hover {
  color: #1f6949;
  box-shadow: 0 6px 16px rgba(38, 82, 61, 0.18);
}

.wb-v2-workspace .wb-v2-sidebar-toggle:focus-visible {
  outline: 2px solid #10b981;
  outline-offset: 2px;
}

.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-brand {
  padding-left: 12px;
  padding-right: 12px;
}

.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-brand-copy,
.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-label {
  display: none;
}

.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-nav,
.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-footer {
  padding-left: 9px;
  padding-right: 9px;
}

.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-nav > button,
.wb-v2-workspace .wb-v2-sidebar.is-collapsed .wb-v2-sidebar-footer > button {
  justify-content: center;
  padding-left: 0;
  padding-right: 0;
  gap: 0;
}

@media (prefers-reduced-motion: reduce) {
  .wb-v2-workspace .wb-v2-sidebar,
  .wb-v2-workspace .wb-v2-sidebar-toggle {
    transition: none;
  }
}
```

Replace the fragile mobile “last child” hiding rule with explicit sidebar label classes, and ensure mobile wins over a previously selected desktop collapsed state:

```css
@media (max-width: 820px) {
  .wb-v2-workspace .wb-v2-sidebar,
  .wb-v2-workspace nav.wb-v2-sidebar.is-collapsed { width: 84px !important; }
  .wb-v2-workspace .wb-v2-sidebar-brand { padding: 26px 12px; }
  .wb-v2-workspace .wb-v2-sidebar-brand-copy,
  .wb-v2-workspace .wb-v2-sidebar-label,
  .wb-v2-workspace .wb-v2-sidebar-toggle { display: none; }
  .wb-v2-workspace .wb-v2-sidebar-nav { padding: 12px; }
  .wb-v2-workspace .wb-v2-sidebar-nav > button { justify-content: center; padding: 0; }
}
```

Keep the unrelated topbar, main, metric-grid, and candidate-hero declarations already present in that media query.

- [ ] **Step 2: Add the transient state and expose it to the template**

Immediately after the existing `workbenchNav` state, add:

```js
const workbenchSidebarCollapsed = ref(false);
```

Do not add a watcher, storage read, storage write, save call, or cloud-sync call for this state.

In the `return` object, keep the names together:

```js
workbenchMode, workbenchNav, workbenchSidebarCollapsed, workbenchNavItems, workbenchRoute, globalCreateMenu, canWrite, canManageMembers, canConfigureAi,
```

- [ ] **Step 3: Bind the navigation class and add the accessible toggle**

Change the opening navigation element to:

```html
<nav id="workbench-main-navigation" aria-label="新版工作台主导航"
  :class="['wb-v2-sidebar w-56 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col', { 'is-collapsed': workbenchSidebarCollapsed }]">
```

Replace the Logo block with:

```html
<div class="wb-v2-sidebar-brand px-5 py-6 border-b border-slate-100">
  <div class="wb-v2-sidebar-brand-copy">
    <p class="text-[10px] font-bold tracking-[0.2em] text-emerald-700 uppercase">Headhunter</p>
    <h1 class="text-base font-bold text-slate-900 mt-0.5">猎头工作台</h1>
  </div>
  <button class="wb-v2-sidebar-toggle" type="button"
    aria-controls="workbench-main-navigation"
    :aria-expanded="!workbenchSidebarCollapsed"
    :aria-label="workbenchSidebarCollapsed ? '展开导航栏' : '收起导航栏'"
    :title="workbenchSidebarCollapsed ? '展开导航栏' : '收起导航栏'"
    @click="workbenchSidebarCollapsed = !workbenchSidebarCollapsed">
    <svg aria-hidden="true" class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
      <path v-if="workbenchSidebarCollapsed" stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
      <path v-else stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
    </svg>
  </button>
</div>
```

- [ ] **Step 4: Make navigation and footer text explicitly hideable**

Add `wb-v2-sidebar-nav` to the existing navigation-items container. Add a dynamic title to each navigation item and wrap its visible label:

```html
<div class="wb-v2-sidebar-nav flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
  <button v-for="item in workbenchNavItems" :key="item.key" type="button"
    :aria-label="item.label" :title="workbenchSidebarCollapsed ? item.label : ''"
    @click="selectWorkbenchNav(item.key)"
    :class="['w-full text-left px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all flex items-center gap-3',
      workbenchNav === item.key ? 'bg-emerald-800 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-50']">
    <!-- Keep every existing icon branch unchanged here. -->
    <span class="wb-v2-sidebar-label">{{ item.label }}</span>
  </button>
</div>
```

Add `wb-v2-sidebar-footer` to the existing footer container. Wrap only the two visible footer text nodes, keeping the conditions, click handlers, icon spans, button types, and classes unchanged:

```html
<span class="wb-v2-sidebar-label">迁移旧数据 →</span>
```

```html
<span class="wb-v2-sidebar-label">V2 数据已启用 ›</span>
```

- [ ] **Step 5: Run the focused test and accessibility checks**

Run:

```powershell
node --test src/ui/sidebar-collapse.test.mjs src/accessibility-static.test.mjs
```

Expected: all tests PASS. In particular, there must be no missing button type, broken static ID reference, missing default state, or missing responsive selector.

- [ ] **Step 6: Run the complete automated suite**

Run:

```powershell
npm test
```

Expected: all tests PASS, including `production-build.test.mjs`; the build invoked by that test must complete successfully.

- [ ] **Step 7: Inspect and commit the self-contained feature**

Run:

```powershell
git diff --check
git diff -- index.html package.json src/ui/sidebar-collapse.test.mjs
git status --short
```

Expected: only `index.html`, `package.json`, and `src/ui/sidebar-collapse.test.mjs` are part of the implementation diff, with no whitespace errors or unrelated edits.

Commit:

```powershell
git add -- index.html package.json src/ui/sidebar-collapse.test.mjs
git commit -m "feat: add collapsible workbench sidebar"
```

### Task 3: Verify responsive behavior in a real browser

**Files:**
- Verify: `index.html`
- Verify: `dist/index.html`
- Verify: `dist/assets/workbuddy.css`

- [ ] **Step 1: Produce a fresh production build**

Run:

```powershell
npm run build
```

Expected: exit code 0 and output containing `构建完成`.

- [ ] **Step 2: Start the local app for browser verification**

Run in a background terminal:

```powershell
npm run dev -- --host 127.0.0.1
```

Expected: Vite reports a local `http://127.0.0.1:<port>/` URL without startup errors.

- [ ] **Step 3: Verify normal desktop behavior at 1440px**

Open the Vite URL in a real browser and verify:

1. The sidebar initially renders at 288px with brand and menu labels visible.
2. The toggle announces “收起导航栏” and has `aria-expanded="true"`.
3. Clicking it produces a 72px icon rail, hides labels, retains every icon and the active green highlight, and expands the main content.
4. The same button now announces “展开导航栏” and has `aria-expanded="false"`.
5. Keyboard Tab can focus the toggle and navigation buttons; Enter and Space activate the toggle.
6. Clicking at least “公司” and “人才库” while collapsed changes the module and preserves the collapsed rail.
7. Refreshing the page restores the fully expanded sidebar.

- [ ] **Step 4: Verify intermediate desktop behavior at 1200px**

Set the viewport to 1200px wide and verify:

1. Expanded width follows the existing 244px rule.
2. Manual collapse still produces 72px.
3. Manual expansion returns to 244px.

- [ ] **Step 5: Verify narrow-screen behavior at 800px**

Set the viewport to 800px wide and verify:

1. The existing automatic rail is 84px.
2. The manual toggle is not displayed.
3. Navigation icons remain visible and usable; labels remain hidden.
4. No horizontal layout regression appears in the main workbench.

- [ ] **Step 6: Check the browser console and final repository state**

Verify the browser console has no new Vue warnings, JavaScript errors, failed local assets, or accessibility-related exceptions caused by the feature.

Then run:

```powershell
git status --short --branch
git log -3 --oneline
```

Expected: the branch is `codex/sidebar-collapse`; the design, plan, and feature commits are present; the working tree is clean. Do not push, merge, or deploy until the user explicitly chooses that next step.
