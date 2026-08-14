# Workbench Activity Sections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the approved light workspace treatment to the homepage channel funnel, today todo, and today review sections without changing data or interactions.

**Architecture:** Keep the existing single-file Vue template and computed data. Add shared homepage section styles and replace only the three homepage section templates; preserve existing click handlers, filters, and data bindings. Use inline SVG icons for controls and due states.

**Tech Stack:** Vue template in `index.html`, Tailwind-generated `public/assets/workbuddy.css`, Node test suite, GitHub Pages deployment.

---

### Task 1: Add shared workspace spacing and alignment styles

**Files:**
- Modify: `index.html` homepage style block around `.wb-home-section` and `.wb-home-funnel`.
- Generated: `public/assets/workbuddy.css` after the build.

- [x] Add section spacing, border, and typography rules for the funnel, todo, and review sections. Add fixed-width rate placeholders and fixed two-column due metadata alignment.
- [x] Keep existing interaction classes and only change presentation styles.

### Task 2: Update homepage templates with the approved structure

**Files:**
- Modify: `index.html` homepage template around `home-talent-funnel-title`, `home-todo-title`, and `home-review-title`.

- [x] Add the approved top spacing and replace text arrows / symbol icons with inline SVG chevrons, calendar, clock, and view-all arrows.
- [x] Keep `openHomeFunnelCandidates`, `openHomeFunnelChannelDetails`, `openHomeFunnelChannelImport`, `openTodoDetail`, `openTodoListView`, and `openTodoForm` bindings unchanged.
- [x] Add a rate placeholder to the final funnel row so `进入面试` aligns with preceding counts.
- [x] Render todo due metadata as an icon column plus text column, preserving overdue color semantics.
- [x] Keep the existing review stats and editable notes bindings intact.

### Task 3: Verify and ship

**Files:**
- Test: existing homepage and UI test suites.

- [x] Run targeted homepage/UI tests and confirm all pass.
- [x] Run `npm test` and `npm run build` serially.
- [x] Review `git diff --check`, commit only source and generated CSS, and leave user-owned task files untouched.
- [ ] Push the branch and `main`, wait for GitHub Actions success, and verify the Pages URL returns HTTP 200.
