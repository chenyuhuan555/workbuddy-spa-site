import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { parse } from 'parse5';

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
  assert.equal(fs.existsSync(new URL('../dist/THIRD_PARTY_NOTICES.md', import.meta.url)), true, '发布包应包含第三方许可证通知');
  assert.equal(fs.existsSync(new URL('../dist/docs/dependencies.md', import.meta.url)), true, '发布包应包含依赖清单');
});

test('发布包中的传统脚本不残留 ES module export 语法', () => {
  const distSrc = new URL('../dist/src/', import.meta.url);
  const files = [];
  function collect(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = new URL(entry.name, directory);
      if (entry.isDirectory()) collect(`${file.href}/`);
      else if (entry.isFile() && file.pathname.endsWith('.js')) files.push(file);
    }
  }
  collect(distSrc);
  assert.ok(files.length > 0, '发布包应包含前端脚本');
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    assert.doesNotMatch(source, /^\s*export\s+(?:function|\{)/m, `传统脚本不应包含 export：${file.pathname}`);
  }
});

test('依赖和许可证清单覆盖所有生产与构建依赖', () => {
  const dependencyFile = new URL('../docs/dependencies.md', import.meta.url);
  const noticesFile = new URL('../THIRD_PARTY_NOTICES.md', import.meta.url);
  assert.equal(fs.existsSync(dependencyFile), true, '应存在 docs/dependencies.md');
  assert.equal(fs.existsSync(noticesFile), true, '应存在 THIRD_PARTY_NOTICES.md');
  const content = `${fs.readFileSync(dependencyFile, 'utf8')}\n${fs.readFileSync(noticesFile, 'utf8')}`;
  const dependencies = ['Vue', 'Supabase JS', 'Tailwind', 'Vite', 'parse5', 'PDF.js', 'JSZip', 'SheetJS', 'jsQR', 'Tesseract.js', 'ECharts', 'Mermaid'];
  for (const dependency of dependencies) {
    assert.match(content, new RegExp(`\\b${dependency.replace('.', '\\.')}`, 'i'), `清单缺少 ${dependency}`);
  }
  for (const field of ['用途', '版本', '来源', '许可证']) {
    assert.match(content, new RegExp(field), `清单缺少${field}字段`);
  }
});

test('基础 CSP 只允许当前业务所需的脚本和连接来源', () => {
  const sourceHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const document = parse(sourceHtml);
  let csp = '';
  function visit(node) {
    if (node.tagName === 'meta') {
      const attributes = Object.fromEntries((node.attrs || []).map(item => [item.name, item.value]));
      if ((attributes['http-equiv'] || '').toLowerCase() === 'content-security-policy') csp = attributes.content || '';
    }
    for (const child of node.childNodes || []) visit(child);
  }
  visit(document);
  assert.ok(csp, '应声明 Content-Security-Policy meta');
  const directives = new Map(csp.split(';').map(item => item.trim()).filter(Boolean).map(item => {
    const [name, ...values] = item.split(/\s+/);
    return [name, values];
  }));
  assert.deepEqual(directives.get('default-src'), ["'self'"]);
  assert.deepEqual(directives.get('object-src'), ["'none'"]);
  assert.deepEqual(directives.get('base-uri'), ["'self'"]);
  assert.deepEqual(directives.get('form-action'), ["'self'"]);
  assert.doesNotMatch((directives.get('script-src') || []).join(' '), /cdn\.jsdelivr\.net|unpkg\.com/);
  const connections = directives.get('connect-src') || [];
  assert.equal(connections.includes('https:'), false, 'connect-src 不得允许任意 HTTPS');
  assert.equal(connections.includes('*'), false, 'connect-src 不得使用通配来源');
  for (const source of [
    'https://pskqpgzwifdozaxprpik.supabase.co',
    'wss://pskqpgzwifdozaxprpik.supabase.co',
    'https://api.deepseek.com',
    'https://api.rss2json.com',
    'https://api.allorigins.win',
    'https://raw.githubusercontent.com',
  ]) assert.ok(connections.includes(source), `connect-src 缺少 ${source}`);
  assert.doesNotMatch(sourceHtml, /https:\/\/(?:cdn\.jsdelivr\.net|unpkg\.com)\/vue@3\/dist\/vue\.global\.prod\.js/);
});

test('AI 访问器在所有动作初始化前可安全提升', () => {
  const sourceHtml = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(sourceHtml, /function requireDeepSeekApiKey\(\)\s*\{\s*return aiConfigActions\.requireKey\(\);\s*\}/);
  assert.doesNotMatch(sourceHtml, /const requireDeepSeekApiKey\s*=\s*\(\)\s*=>/);
  assert.match(sourceHtml, /var cloudReady\s*=\s*false/);
  assert.doesNotMatch(sourceHtml, /(?:let|const) cloudReady\s*=\s*false/);
});
