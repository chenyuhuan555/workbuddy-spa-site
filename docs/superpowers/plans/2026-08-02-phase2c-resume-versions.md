# Phase 2c Resume Versions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将简历版本元数据以独立 `resume_versions` 行进行双写和可重跑迁移，同时保留 `candidates.resume_versions` 作为当前读取源和回退副本。

**Architecture:** 新 repo 负责版本元数据的字段映射、`extra` 兼容字段、分页读取和批量 upsert；`index.html` 只编排版本级双写、迁移进度和一致性校验。rawText/formattedText 继续由 `resume_texts` 管理，原始文件继续由 Storage/IndexedDB 管理；本阶段不切换页面读路径。

**Tech Stack:** Vue 3 IIFE、Supabase PostgREST、PostgreSQL/RLS、IndexedDB 快照、Node.js `node:test`。

---

### Task 1: Define the independent resume_versions row contract

**Files:**
- Create: `src/services/repo/resume-version-repo.js`
- Create: `src/services/repo/resume-version-repo.test.mjs`
- Create: `supabase/resume-versions.sql`
- Modify: `package.json`

- [x] **Step 1: Write failing tests** for metadata mapping, stripping raw/formatted/fileData, preserving unknown fields through `extra`, deterministic pagination, and writer/reader role checks.
- [x] **Step 2: Run** `node --test src/services/repo/resume-version-repo.test.mjs` and confirm module-not-found failure.
- [x] **Step 3: Implement** `toRow`, `toModel`, `upsertVersions`, `listVersionsPage`, `listAllVersions`, and `countVersions` with the existing repo error contract.
- [x] **Step 4: Add** idempotent SQL with text IDs, candidate reference by text, `extra jsonb`, metadata columns, timestamps, indexes, trigger, and RLS.
- [x] **Step 5: Run** focused tests and commit the repo/DDL boundary.

### Task 2: Add version-level synchronization and migration state

**Files:**
- Modify: `index.html`
- Modify: `src/services/repo/resume-version-repo.test.mjs`

- [x] **Step 1: Write failing static assertions** for the module script, version-row collection, serialized version sync, migration metadata, and migration UI.
- [x] **Step 2: Run** the focused test and confirm the integration assertions fail.
- [x] **Step 3: Implement** `syncResumeVersionsWithCloud()` with fingerprint-based incremental upsert and `runResumeVersionMigration()` with `forceAll`, progress, failure counts, and `workbenchV2.migrationMeta.resumeVersions`.
- [x] **Step 4: Trigger version sync after candidate sync during startup and normal push, while retaining `candidates.resume_versions` as the existing read source.
- [x] **Step 5: Run** focused tests and commit the integration.

### Task 3: Add non-destructive parity verification and operator documentation

**Files:**
- Modify: `index.html`
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-08-02-phase2c-resume-versions.md`

- [x] **Step 1: Add** a strict metadata parity action that compares active local version IDs and fingerprints with `resume_versions` rows, without changing the rendered candidate data.
- [x] **Step 2: Add** a settings card explaining that Phase 2c is dual-write only and that SQL can be applied later.
- [x] **Step 3: Document** the unified SQL/migration order and explicitly state that no read switch occurs in Phase 2c.
- [x] **Step 4: Run** `npm test`, `npm run build`, inline-script parsing, `npm audit --audit-level=high --registry=https://registry.npmjs.org/`, and `git diff --check`.
- [x] **Step 5: Commit** the Phase 2c implementation and documentation.
