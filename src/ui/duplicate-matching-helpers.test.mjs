import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./duplicate-matching-helpers.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const helpers = context.globalThis.WorkBuddyDuplicateMatchingHelpers;

test('normalizes duplicate text and builds bounded shingles', () => {
  assert.equal(helpers.normalizeDuplicateText(' Java 开发! '), 'java开发');
  assert.equal(helpers.makeTextShingles('abcdef', 3, 2).size, 2);
});

test('calculates set overlap and case-insensitive intersections', () => {
  assert.equal(helpers.setOverlapRatio(new Set(['a', 'b']), new Set(['b', 'c'])), 0.5);
  assert.deepEqual(Array.from(helpers.intersectValues(['Java', '后端'], ['java'])), ['Java']);
});

test('scores strong duplicate signatures and rejects conflicts', () => {
  const same = { surname: '张', gender: '男', normalizedName: 'zhangsan', dataKey: 'same', textShingles: new Set(), companies: [], tokens: [] };
  assert.equal(helpers.compareDuplicateSignatures(same, same).score, 99);
  assert.equal(helpers.compareDuplicateSignatures({ ...same, surname: '李' }, same), null);
});

test('serializes a duplicate match for persistence', () => {
  assert.equal(JSON.stringify(helpers.serializeDuplicateMatch({ resume: { id: 'r1', name: '张三' }, job: { id: 'j1', company: '甲' }, pos: { id: 'p1', name: '工程师' }, col: { name: '推荐' }, score: 96 })), JSON.stringify({
    resumeId: 'r1', resumeName: '张三', jobId: 'j1', company: '甲', posId: 'p1', position: '工程师', colName: '推荐', score: 96, reasons: []
  }));
});
