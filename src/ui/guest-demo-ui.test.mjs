import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('guest mode is visibly disclosed in the top bar and content area', () => {
  assert.match(html, /v-if="isGuestMode"[^>]*>[\s\S]*?游客演示模式/);
  assert.match(html, /当前内容均为虚构演示数据/);
  assert.match(html, /不会上传云端/);
  assert.match(html, /数据仅保存在当前浏览器/);
});

test('guest top bar exposes login and reset actions', () => {
  assert.match(html, /@click="openGuestLogin"[^>]*>[\s\S]*?登录查看真实数据/);
  assert.match(html, /@click="resetGuestDemo"[^>]*>[\s\S]*?重置演示数据/);
  assert.match(html, /function openGuestLogin\(\)[\s\S]*?WorkBuddyAuthUi\.openLogin\(\)/);
  assert.match(html, /function resetGuestDemo\(\)[\s\S]*?confirm\('重置后将删除您在本浏览器中的全部演示修改，确定继续吗？'\)/);
  assert.match(html, /guestDemo\.resetWorkspace\(\)/);
});

test('guest login overlay has a route back to the demo', () => {
  assert.match(html, /id="wb-login-cancel"/);
  assert.match(html, />返回游客演示</);
});

test('guest runtime values and actions are exposed to the Vue template', () => {
  const setupReturn = html.slice(html.lastIndexOf('return {'), html.indexOf('\n    };', html.lastIndexOf('return {')));
  assert.match(setupReturn, /isGuestMode/);
  assert.match(setupReturn, /openGuestLogin/);
  assert.match(setupReturn, /resetGuestDemo/);
});

test('guests can use AI features but cannot navigate to real settings', () => {
  assert.match(html, /filter\(item => canConfigureAi \|\| item\.key !== 'settings'\)/);
  assert.match(html, /filter\(item => !isGuestMode \|\| item\.key !== 'settings'\)/);
});

test('guest mode hides cloud migration and backup management cards', () => {
  assert.match(html, /<section id="settings-section" v-if="!isGuestMode" class="backup-section">/);
  assert.match(html, /管理设置仅对登录用户开放/);
});
