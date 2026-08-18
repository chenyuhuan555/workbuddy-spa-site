import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./candidate-network-display.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const display = context.globalThis.WorkBuddyCandidateNetworkDisplay;

test('normalizes trajectory names for network buckets', () => {
  assert.equal(display.normalizeTrajectoryName('  Acme / China  '), 'acme-china');
});

test('formats relation labels and handles empty edges', () => {
  assert.equal(display.relationLabel({ type: 'edu', name: '清华', period: '2020-01 至 2021-01' }), '2020-01 至 2021-01 清华校友');
  assert.equal(display.relationLabel(null), '');
});

test('maps evaluation state to network colors', () => {
  assert.equal(display.networkNodeColor({ evaluation: 'match' }), '#10b981');
  assert.equal(display.networkNodeColor({ evaluation: 'pending' }), '#ef4444');
  assert.equal(display.networkNodeColor({ evaluation: 'reject' }), '#94a3b8');
});
