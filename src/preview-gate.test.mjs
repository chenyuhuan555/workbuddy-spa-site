// 认证绕过回归测试：离线预览模式的环境门禁
// 背景：index.html 的离线预览块会绕过 Supabase 认证并注入 role='admin'。
//       历史上该块无任何环境判定，生产/GitHub Pages 访客在认证超时(4s)后会被自动提升为 admin。
// 本测试锁死修复后的行为，防止回归：
//   - 生产域名(https + 真实 hostname) 一律不放行；
//   - 仅 file:// / localhost / 127.0.0.1 / ::1 / 显式 WORKBUDDY_PREVIEW_MODE 标记放行；
//   - 不因认证失败/超时放行；不通过 URL 查询参数放行。
// 运行：node --test src/preview-gate.test.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { isPreviewEnvAllowed } = require('./preview-gate.js');

const INDEX_HTML = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

// ---------------------------------------------------------------------------
// (1) 生产环境：绝不放行（核心安全断言）
// ---------------------------------------------------------------------------

test('生产 https 自定义域名不放行', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'app.example.com' }, {}), false);
});

test('GitHub Pages 域名不放行', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'someuser.github.io' }, {}), false);
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'org.github.io' }, {}), false);
});

test('生产 http 域名不放行', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'http:', hostname: 'example.com' }, {}), false);
});

test('不因认证失败/超时而放行：门禁只看环境，与认证状态无关', () => {
  // 模拟"认证未完成"场景在生产域名下：仍必须返回 false
  const prodLoc = { protocol: 'https:', hostname: 'prod.example.com' };
  assert.equal(isPreviewEnvAllowed(prodLoc, { authTimedOut: true, supabaseDown: true }), false);
});

test('不通过 URL 查询参数放行（生产域名 + ?preview=1/?admin=1 依旧 false）', () => {
  const loc = { protocol: 'https:', hostname: 'prod.example.com', search: '?preview=1&admin=1' };
  assert.equal(isPreviewEnvAllowed(loc, {}), false);
});

test('伪装子域名不放行（localhost.evil.com）', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'localhost.evil.com' }, {}), false);
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'x127.0.0.1.evil.com' }, {}), false);
});

// ---------------------------------------------------------------------------
// (2) 允许的本地/显式环境：放行
// ---------------------------------------------------------------------------

test('file:// 协议放行', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'file:', hostname: '' }, {}), true);
});

test('localhost / 127.0.0.1 / ::1 放行', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'http:', hostname: 'localhost' }, {}), true);
  assert.equal(isPreviewEnvAllowed({ protocol: 'http:', hostname: '127.0.0.1' }, {}), true);
  assert.equal(isPreviewEnvAllowed({ protocol: 'http:', hostname: '::1' }, {}), true);
  assert.equal(isPreviewEnvAllowed({ protocol: 'http:', hostname: '[::1]' }, {}), true);
});

test('显式 WORKBUDDY_PREVIEW_MODE 标记放行（构建/测试专用，不入生产）', () => {
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'prod.example.com' }, { WORKBUDDY_PREVIEW_MODE: true }), true);
  // 非严格 true 的值不放行，防止被真值污染
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'prod.example.com' }, { WORKBUDDY_PREVIEW_MODE: 1 }), false);
  assert.equal(isPreviewEnvAllowed({ protocol: 'https:', hostname: 'prod.example.com' }, { WORKBUDDY_PREVIEW_MODE: 'true' }), false);
});

test('异常输入默认拒绝', () => {
  assert.equal(isPreviewEnvAllowed(null, null), false);
  assert.equal(isPreviewEnvAllowed(undefined, undefined), false);
});

// ---------------------------------------------------------------------------
// (3) index.html 静态断言：预览块必须先过门禁再注入 admin
// ---------------------------------------------------------------------------

test('index.html 引入了 preview-gate.js', () => {
  assert.match(INDEX_HTML, /src=["']\.\/src\/preview-gate\.js/, '必须加载 preview-gate.js');
});

test('index.html 预览块在注入 admin 前调用了 isPreviewEnvAllowed 门禁', () => {
  // 定位离线预览 IIFE 块
  const startIdx = INDEX_HTML.indexOf('沙箱/离线预览');
  assert.ok(startIdx !== -1, '应存在离线预览块');
  const block = INDEX_HTML.slice(startIdx, startIdx + 3000);
  const gateIdx = block.indexOf('isPreviewEnvAllowed');
  const adminIdx = block.indexOf("role: 'admin'");
  assert.ok(gateIdx !== -1, '预览块必须调用 isPreviewEnvAllowed 门禁');
  assert.ok(adminIdx !== -1, '预览块应包含 admin 注入（用于回归定位）');
  assert.ok(gateIdx < adminIdx, '门禁判定必须出现在 admin 注入之前');
});

test('index.html 预览块存在早退门禁（不满足环境即 return，不排定超时）', () => {
  const startIdx = INDEX_HTML.indexOf('沙箱/离线预览');
  const block = INDEX_HTML.slice(startIdx, startIdx + 3000);
  // 门禁失败必须 return，且出现在 setTimeout 之前
  const gateReturnPattern = /isPreviewEnvAllowed[\s\S]{0,120}?return;/;
  assert.match(block, gateReturnPattern, '门禁不通过必须直接 return');
  const gateIdx = block.indexOf('isPreviewEnvAllowed');
  const timeoutIdx = block.indexOf('setTimeout');
  assert.ok(gateIdx !== -1 && timeoutIdx !== -1 && gateIdx < timeoutIdx, '门禁必须在 setTimeout 之前');
});
