import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./trajectory-date-utils.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const utils = context.globalThis.WorkBuddyTrajectoryDateUtils;

test('parses year-month and year-only trajectory dates', () => {
  assert.deepEqual({ ...utils.parseTrajectoryDate('2024-03') }, { year: 2024, month: 3, value: 24291 });
  assert.equal(utils.parseTrajectoryDate('2024', 'end').month, 12);
  assert.equal(utils.parseTrajectoryDate('unknown'), null);
});

test('calculates inclusive month overlap', () => {
  assert.equal(utils.monthsOverlap({ start: '2024-01', end: '2024-06' }, { start: '2024-04', end: '2024-09' }), 3);
  assert.equal(utils.monthsOverlap({ start: '2024-01', end: '2024-02' }, { start: '2024-03', end: '2024-04' }), 0);
});

test('formats the intersection period', () => {
  assert.equal(utils.trajectoryPeriodLabel({ start: '2024-01', end: '2024-06' }, { start: '2024-04', end: '2024-09' }), '2024-04 至 2024-06');
  assert.equal(utils.trajectoryPeriodLabel({ start: '2024-01', end: '2024-02' }, { start: '2024-03', end: '2024-04' }), '');
});
