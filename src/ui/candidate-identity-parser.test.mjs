import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./candidate-identity-parser.js', import.meta.url), 'utf8');
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const parser = context.globalThis.WorkBuddyCandidateIdentityParser;

test('extracts explicit candidate name before filename fallback', () => {
  assert.equal(parser.extractCandidateName('姓名：张三', '李四-简历.pdf'), '张三');
  assert.equal(parser.extractCandidateName('', '李四-简历.pdf'), '李四');
});

test('extracts gender from labeled or standalone text', () => {
  assert.equal(parser.extractCandidateGender('性别：女'), '女');
  assert.equal(parser.extractCandidateGender('男，上海'), '男');
  assert.equal(parser.extractCandidateGender('未知'), '');
});
