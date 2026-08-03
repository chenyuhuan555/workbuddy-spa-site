import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

await import('./markdown-safety.js');
const safety = globalThis.WorkBuddyMarkdownSafety;
const indexHtml = await readFile(resolve(process.cwd(), 'index.html'), 'utf8');

test('Markdown URL 只允许安全协议和相对链接', () => {
  assert.equal(safety.sanitizeUrl('https://example.com/a'), 'https://example.com/a');
  assert.equal(safety.sanitizeUrl('mailto:hello@example.com'), 'mailto:hello@example.com');
  assert.equal(safety.sanitizeUrl('/docs/readme'), '/docs/readme');
  assert.equal(safety.sanitizeUrl('#section'), '#section');
  assert.equal(safety.sanitizeUrl('javascript:alert(1)'), '#');
  assert.equal(safety.sanitizeUrl('data:text/html,<script>alert(1)</script>'), '#');
  assert.equal(safety.sanitizeUrl('vbscript:msgbox(1)'), '#');
});

test('Markdown 属性值会转义引号和控制字符', () => {
  assert.equal(safety.escapeAttribute('https://example.com/?q="x"'), 'https://example.com/?q=&quot;x&quot;');
  assert.equal(safety.escapeAttribute('a\n b\r c'), 'a b c');
});

test('知识库 Markdown 渲染统一使用安全链接处理', () => {
  assert.match(indexHtml, /markdown-safety\.js/);
  assert.match(indexHtml, /WorkBuddyMarkdownSafety\.sanitizeUrl/);
  assert.match(indexHtml, /rel="noopener noreferrer"/);
});
