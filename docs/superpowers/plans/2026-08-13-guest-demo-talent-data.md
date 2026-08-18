# Guest Demo Talent Data Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expand the guest demo to twelve fully populated fictional candidates with connected companies, positions, channels, and funnel applications.

**Architecture:** Keep the existing `src/guest-demo.js` seed factory as the sole source of guest records. Extend its candidate helper inputs and seed arrays without changing runtime schemas or live persistence. Add focused assertions to the existing guest demo tests for count, field completeness, demo isolation, and funnel relationships.

**Tech Stack:** Vanilla JavaScript modules, Node test runner, existing WorkBuddy demo seed schema.

---

### Task 1: Establish failing guest-demo completeness checks

**Files:**
- Modify: `src/guest-demo.test.mjs`

- [ ] **Step 1: Add assertions for twelve candidates and complete candidate fields.**

Assert the loaded guest workspace has 12 candidates and every candidate has non-empty values for the talent-library fields: `name`, `currentCompany`, `currentTitle`, `age`, `education`, `resumeSummary`, `currentBase`, `expectedBase`, `currentSalary`, `expectedSalary`, `motivation`, `owner`, `touchedAt`, `intakeAt`, and `updatedAt`. Also assert every company, position, application, and candidate is marked `demo: true` and every application references an existing candidate, position, and company.

- [ ] **Step 2: Run the focused test and verify it fails.**

Run: `node --test src/guest-demo.test.mjs`

Expected: FAIL because the current seed has eight candidates and several missing fields.

### Task 2: Extend the guest seed data

**Files:**
- Modify: `src/guest-demo.js`

- [ ] **Step 1: Extend the candidate helper defaults.**

Give candidates deterministic demo defaults for missing display fields, then provide explicit values for all twelve records so no talent-library cell is blank. Preserve existing resume text and application metadata.

- [ ] **Step 2: Add four fictional companies/positions or reuse existing companies where appropriate.**

Add records for complementary roles such as enterprise AI sales, fintech product, healthcare operations, and data engineering. Each new position must belong to an existing or newly added demo company and include city, salary range, owner, and skills.

- [ ] **Step 3: Add four applications and pipeline events.**

Connect each new candidate to a valid position and company. Use distinct stages across the existing funnel vocabulary and add realistic fictional match scores, reasons, and event history so homepage channel经营统计 has multiple states.

- [ ] **Step 4: Run the focused test and verify it passes.**

Run: `node --test src/guest-demo.test.mjs`

Expected: all guest-demo tests PASS.

### Task 3: Verify the application boundary and production bundle

**Files:**
- No source changes expected.

- [ ] **Step 1: Run the full test suite.**

Run: `npm test`

Expected: all tests PASS.

- [ ] **Step 2: Build the production bundle.**

Run: `npm run build`

Expected: build completes successfully.

- [ ] **Step 3: Review the diff and commit the data change.**

Run: `git diff --check`, then stage `src/guest-demo.js` and `src/guest-demo.test.mjs` and commit with message `feat: enrich guest demo talent data`.
