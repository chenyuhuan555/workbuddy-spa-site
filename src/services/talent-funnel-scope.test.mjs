import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./talent-funnel-scope.js');
const Scope = globalThis.WorkBuddyTalentFunnelScope;

test('isCompanyInPilot 仅接受手动 allowlist 内的公司 id', () => {
  assert.equal(Scope.isCompanyInPilot('co_quantum_1', { companyIds: ['co_quantum_1', 'co_quantum_2'] }), true);
  assert.equal(Scope.isCompanyInPilot('co_other', { companyIds: ['co_quantum_1', 'co_quantum_2'] }), false);
  assert.equal(Scope.isCompanyInPilot('  ', { companyIds: ['co_quantum_1'] }), false);
});

test('scope 只接受 companyIds，别名字段不能扩大试点范围', () => {
  const aliasOnly = {
    companyIds: [],
    allowlist: ['co_quantum_1'],
    manualCompanyIds: ['co_quantum_1'],
    companyId: 'co_quantum_1',
    baselineAt: '2026-08-11T00:00:00.000Z',
  };

  assert.equal(Scope.isCompanyInPilot('co_quantum_1', aliasOnly), false);
  assert.equal(Scope.isEventInPilot({ companyId: 'co_quantum_1', occurredAt: '2026-08-11T09:00:00.000Z' }, aliasOnly), false);
});

test('isEventInPilot 要求公司命中 allowlist 且 occurredAt 不早于 baselineAt', () => {
  const scope = { companyIds: ['co_quantum_1'], baselineAt: '2026-08-11T00:00:00.000Z' };

  assert.equal(Scope.isEventInPilot({ companyId: 'co_quantum_1', occurredAt: '2026-08-11T00:00:00.000Z' }, scope), true);
  assert.equal(Scope.isEventInPilot({ companyId: 'co_quantum_1', occurredAt: '2026-08-10T23:59:59.000Z' }, scope), false);
  assert.equal(Scope.isEventInPilot({ companyId: 'co_other', occurredAt: '2026-08-11T09:00:00.000Z' }, scope), false);
});

test('缺少 baselineAt 或事件时间时，scope 默认拒绝回填旧事件', () => {
  assert.equal(Scope.isEventInPilot({ companyId: 'co_quantum_1', occurredAt: '2026-08-11T09:00:00.000Z' }, { companyIds: ['co_quantum_1'] }), false);
  assert.equal(Scope.isEventInPilot({ companyId: 'co_quantum_1' }, { companyIds: ['co_quantum_1'], baselineAt: '2026-08-11T00:00:00.000Z' }), false);
});
