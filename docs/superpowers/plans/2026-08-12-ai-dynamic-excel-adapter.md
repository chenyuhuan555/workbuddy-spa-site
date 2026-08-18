# AI Dynamic Excel Adapter Implementation Plan

> **For agentic workers:** Execute this plan task-by-task with tests before implementation changes.

**Goal:** Let each candidate Excel batch use AI to map variable headers and preserve unknown fields before the user confirms import.

**Architecture:** Keep the current deterministic header mapping as a fast fallback. Add a pure adapter contract that accepts AI field mappings, then let the page send only headers and a small sample to the existing AI gateway. The preview remains isolated from the talent store; only confirmation creates candidates.

**Tech Stack:** Single-file Vue SPA, vanilla JavaScript modules, Node test runner, existing DeepSeek gateway.

---

### Task 1: Dynamic mapping contract

**Files:**
- Modify: `src/services/candidate-excel-import.js`
- Test: `src/services/candidate-excel-import.test.mjs`

- [ ] Add failing tests for canonical field mapping, unknown-column preservation, and AI mapping message/result normalization.
- [ ] Run the adapter test and confirm the new tests fail because the contract is missing.
- [ ] Implement `buildCandidateExcelAiMappingMessages`, `normalizeCandidateExcelAiMapping`, and `applyCandidateExcelAiMapping` without changing persistence.
- [ ] Run adapter tests and confirm they pass.

### Task 2: Preview integration

**Files:**
- Modify: `index.html`
- Test: `src/services/candidate-excel-import.test.mjs`

- [ ] Add a failing static contract test requiring mapping analysis before preview duplicate marking and requiring an AI mapping progress label.
- [ ] Run the targeted test and confirm it fails.
- [ ] Send headers plus up to 8 sample rows to the existing AI gateway, apply the normalized mapping, and fall back to deterministic parsing if AI is unavailable.
- [ ] Keep `candidateExcelImport.rows` preview-only and leave `confirmCandidateExcelImport` as the sole candidate creation path.
- [ ] Run targeted tests and the production build.

### Task 3: Verification and release

**Files:**
- Modify: `README.md` only if the import behavior documentation is stale.

- [ ] Run `npm test`, `npm run build`, and `git diff --check`.
- [ ] Review the staged diff and ensure the existing Supabase SQL edits are not staged.
- [ ] Commit with `feat: add AI dynamic Excel field mapping` and push `main`.
- [ ] Verify the GitHub Actions deployment and live page markers.
