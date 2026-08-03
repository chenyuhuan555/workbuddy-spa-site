import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./string-list-normalizer.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const normalizeStringList = context.globalThis.WorkBuddyStringListNormalizer.normalizeStringList;

test('normalizes arrays and removes blank items', () => {
  assert.deepEqual(normalizeStringList([' Java ', '', null, '产品']), ['Java', '产品']);
});

test('splits common delimiters and strips list markers', () => {
  assert.deepEqual(Array.from(normalizeStringList('- Java; 后端；产品、\n* 运营')), ['Java', '后端', '产品', '运营']);
});

test('returns an empty list for empty input', () => {
  assert.deepEqual(Array.from(normalizeStringList('  ')), []);
  assert.deepEqual(Array.from(normalizeStringList(null)), []);
});
