import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./migration-meta.js');
const { createMigrationMetaAccessor } = globalThis.WorkBuddyMigrationMeta;

test('迁移元数据访问器按域创建并复用状态对象', () => {
  const state = {};
  const meta = createMigrationMetaAccessor(() => state);
  assert.deepEqual(meta.candidateCloud(), {});
  meta.resumeVersions().backfilledAt = 'now';
  assert.equal(meta.resumeVersions().backfilledAt, 'now');
  assert.notEqual(meta.candidateCloud(), meta.resumeVersions());
  assert.ok(state.migrationMeta);
});

test('迁移元数据访问器拒绝缺少工作区状态', () => {
  const meta = createMigrationMetaAccessor(() => null);
  assert.throws(() => meta.phase3Entities(), /WORKBENCH_STATE_UNAVAILABLE/);
});
