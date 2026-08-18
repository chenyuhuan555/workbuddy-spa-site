import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./workspace-state-boundary.js');
const Boundary = globalThis.WorkBuddyWorkspaceStateBoundary;

test('所有业务读路径未启用时保留过渡工作区快照', () => {
  const input = { names: ['公司'], jobs: [[{ id: 'p1' }]], workbenchV2: { candidates: [{ id: 'c1' }] } };
  assert.deepEqual(Boundary.prepare(input, { uiOnly: false }), input);
});

test('UI-only 模式只保留配置与迁移元数据，不携带业务记录', () => {
  const result = Boundary.prepare({ schemaVersion: 4, ui: { sidebarCollapsed: false }, migrationMeta: { phase: 3 }, candidates: [{ id: 'c1' }] }, { uiOnly: true });
  assert.deepEqual(result, { schemaVersion: 5, ui: { sidebarCollapsed: false }, migrationMeta: { phase: 3 } });
  assert.equal('candidates' in result, false);
});
