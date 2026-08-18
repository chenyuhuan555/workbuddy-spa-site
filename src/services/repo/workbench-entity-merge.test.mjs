import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./workbench-entity-merge.js');
const { mergeEntityCollections } = globalThis.WorkBuddyWorkbenchEntityMerge;

const row = (overrides = {}) => ({
  id: 'entity-1',
  name: '本地记录',
  updatedAt: '2026-08-02T10:00:00.000Z',
  ...overrides
});

test('云端较新记录覆盖本地记录', () => {
  const result = mergeEntityCollections([row()], [row({ name: '云端记录', updatedAt: '2026-08-02T11:00:00.000Z' })]);
  assert.equal(result.updated, 1);
  assert.equal(result.items[0].name, '云端记录');
  assert.equal(result.conflicts.length, 0);
});

test('本地较新记录保留并报告冲突', () => {
  const result = mergeEntityCollections([row({ name: '本地新记录', updatedAt: '2026-08-02T12:00:00.000Z' })], [row({ name: '云端旧记录' })]);
  assert.equal(result.items[0].name, '本地新记录');
  assert.equal(result.conflicts[0].type, 'local_newer_than_cloud');
});

test('云端较新的删除标记删除本地记录', () => {
  const result = mergeEntityCollections([row()], [row({ deletedAt: '2026-08-02T11:00:00.000Z', updatedAt: '2026-08-02T11:00:00.000Z' })]);
  assert.equal(result.removed, 1);
  assert.equal(result.items.length, 0);
});

test('本地较新的删除冲突保留本地记录', () => {
  const result = mergeEntityCollections([row({ updatedAt: '2026-08-02T12:00:00.000Z' })], [row({ deletedAt: '2026-08-02T11:00:00.000Z', updatedAt: '2026-08-02T11:00:00.000Z' })]);
  assert.equal(result.items.length, 1);
  assert.equal(result.conflicts[0].type, 'local_newer_than_cloud_delete');
});

test('同一时间戳不同内容报告冲突', () => {
  const result = mergeEntityCollections([row({ name: '本地记录' })], [row({ name: '云端记录' })]);
  assert.equal(result.conflicts[0].type, 'same_timestamp_different_payload');
});
