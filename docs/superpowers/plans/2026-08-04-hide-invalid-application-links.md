# Hide Invalid Application Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hide every application whose candidate, company, or position has been deleted from all ordinary frontend views and statistics while preserving the complete application history for persistence, synchronization, backup, and repair.

**Architecture:** Add one pure application-visibility service that derives a stable, non-mutating visible application list from the authoritative Workbench V2 bundle. In `index.html`, expose that list as a Vue computed value and pass a shallow display bundle to all presentation and metric consumers; mutation, persistence, migration, audit, and repair paths continue to use `workbenchV2.applications`.

**Tech Stack:** Vanilla JavaScript IIFE modules, Vue 3 Composition API, Node.js built-in test runner, Vite/Tailwind production build, GitHub Pages.

---

## Task 1: Define the visibility contract with tests

**Files:**
- Create: `src/services/application-visibility.test.mjs`
- Create: `src/services/application-visibility.js`
- Modify: `package.json`

- [ ] Add tests proving a normal application remains visible; applications with a missing or `deletedAt` candidate, company, or position are hidden; closed/paused but existing entities remain visible; invalid application records and deleted application records are hidden; input arrays and order are unchanged.
- [ ] Run `node --test src/services/application-visibility.test.mjs` and verify it fails because the service does not exist.
- [ ] Implement the minimum `filterVisibleApplications({ applications, candidates, companies, positions })` service using active-ID sets and fail-closed relation checks.
- [ ] Add the new unit test to the main `npm test` script.
- [ ] Re-run the focused test and verify it passes.
- [ ] Commit the service, test, and package script.

## Task 2: Wire one display-only application view into the SPA

**Files:**
- Modify: `index.html`
- Modify: `src/production-build.test.mjs`

- [ ] Add failing static integration assertions for the service script, the `visibleApplications` computed value, and the shallow display bundle.
- [ ] Assert user-facing application indexes and detail lists use `visibleApplications`: application lookup, candidate grouping, company grouping, position lists, selected-candidate lists, and the filtered 推进中心 source.
- [ ] Assert presentation statistics use the display bundle/list: company count maps, candidate active counts, dashboard metrics, talent-pool stage distribution, business progress, and position-scoped AI toolbox candidates.
- [ ] Assert raw-data boundaries remain raw: application mutation actions, migration diagnostics, backup/repair loading, replacement, save/sync, and integrity operations continue to use `workbenchV2.applications`.
- [ ] Run the focused production-build test and verify the new assertions fail before implementation.
- [ ] Load `src/services/application-visibility.js` before the inline app script.
- [ ] Add `visibleApplications` and `visibleWorkbenchV2` computed values near the entity indexes.
- [ ] Route only frontend display, search-derived, detail, count, dashboard, funnel, and AI-toolbox consumers through the visible values.
- [ ] Keep application mutations, persistence, synchronization, migration, backups, and repair/audit paths on the raw array.
- [ ] Re-run the focused visibility and production-build tests and verify they pass.
- [ ] Commit the SPA integration and regression assertions.

## Task 3: Full regression, build, review, and deployment

**Files:**
- Verify only; modify only if a regression directly caused by Tasks 1-2 is found.

- [ ] Run `npm test` and verify the complete suite passes.
- [ ] Run `npm run test:modularization` and verify the modularization suite passes.
- [ ] Run `npm run build` and verify the GitHub Pages artifact builds successfully.
- [ ] Review `git diff` and confirm every changed code line traces to application visibility, while the user's pre-existing CSS edit and deleted requirements document remain untouched and unstaged.
- [ ] Scan changed files for placeholders (`TODO`, `FIXME`, temporary skips) and confirm none were introduced.
- [ ] Push the verified commits to `origin/main`.
- [ ] Wait for the GitHub Pages workflow to complete, then verify the production HTML loads the new visibility service and no deleted-company/deleted-position application row is rendered from the known invalid relations.

