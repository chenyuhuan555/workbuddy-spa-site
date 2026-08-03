import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./unique-list.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const uniqueList = context.globalThis.WorkBuddyUniqueList.uniqueList;

test('deduplicates, trims, and limits values', () => {
  assert.deepEqual(Array.from(uniqueList([' A ', 'A', '', null, 'B'], 2)), ['A', 'B']);
});

test('handles non-array input safely', () => {
  assert.deepEqual(Array.from(uniqueList(null)), []);
});
