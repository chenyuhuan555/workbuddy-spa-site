import test from 'node:test';
import assert from 'node:assert/strict';
import { fallbackParseJobText } from './legacy-job-parse-actions.js';

test('fallback parser extracts company, position, location and preserves detail', () => {
  const result = fallbackParseJobText('贝壳招聘高级产品经理，北京，负责招聘平台建设');
  assert.equal(result.company, '贝壳');
  assert.equal(result.positionName, '高级产品经理');
  assert.equal(result.location, '北京');
  assert.match(result.detail, /招聘平台建设/);
});
