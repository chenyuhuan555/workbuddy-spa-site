import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const root = new URL('../', import.meta.url);

test('生产构建使用本地静态 Tailwind CSS', () => {
  execSync('npm run build', {
    cwd: root,
    stdio: 'pipe',
    shell: true,
  });

  const cssFile = new URL('../dist/assets/workbuddy.css', import.meta.url);
  const builtHtml = fs.readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8');
  assert.equal(fs.existsSync(cssFile), true, '应生成 dist/assets/workbuddy.css');
  const css = fs.readFileSync(cssFile, 'utf8');
  assert.ok(Buffer.byteLength(css) > 10_000, '生产 CSS 应包含页面使用的 Tailwind 类');
  assert.doesNotMatch(builtHtml, /cdn\.tailwindcss\.com|tailwindcss\.min\.js/);
  assert.match(builtHtml, /\.\/assets\/workbuddy\.css/);
  for (const selector of ['.hidden', '.grid', '.bg-emerald-700', '.sm\\:grid-cols-2', '.grid-cols-\\[']) {
    assert.ok(css.includes(selector), `生产 CSS 缺少 ${selector}`);
  }
});
