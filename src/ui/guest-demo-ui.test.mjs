import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('guest mode is visibly disclosed in the top bar and content area', () => {
  assert.match(html, /v-if="isGuestMode"[^>]*>[\s\S]*?演示中/);
  assert.match(html, /当前内容均为虚构演示数据/);
  assert.match(html, /不会上传云端/);
  assert.match(html, /数据仅保存在当前浏览器/);
  assert.match(html, /体验 AI 功能请填写 DeepSeek API Key/);
  assert.match(html, /id="guest-deepseek-api-key"/);
  assert.match(html, /workbuddy\.guest\.deepseek_config\.v1/);
  assert.match(html, /guestNoticeVisible/);
  assert.match(html, /guestAiExpanded/);
  assert.match(html, /关闭游客演示提示/);
});

test('guest top bar exposes login and reset actions', () => {
  assert.match(html, /@click="openGuestLogin"[^>]*>[\s\S]*?登录/);
  assert.match(html, /@click="resetGuestDemo"[^>]*>[\s\S]*?重置/);
  assert.match(html, /function openGuestLogin\(\)[\s\S]*?WorkBuddyAuthUi\.openLogin\(\)/);
  assert.match(html, /function resetGuestDemo\(\)[\s\S]*?confirm\('重置后将删除您在本浏览器中的全部演示修改，确定继续吗？'\)/);
  assert.match(html, /guestDemo\.resetWorkspace\(\)/);
  assert.match(html, /guestAiExpanded\.value = false/);
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

test('legacy workbench link uses the user-facing label', () => {
  assert.match(html, /@click="accountMenuOpen = false; showLegacyWorkbench\(\)"[\s\S]*?切换到旧版/);
  assert.match(html, /accountDisplayName/);
  assert.match(html, /accountRoleLabel/);
  assert.match(html, /退出登录/);
  assert.doesNotMatch(html, /V2 数据已启用 ›/);
});

test('company dashboard header keeps a concise subtitle and two focused actions', () => {
  assert.match(html, /查看岗位需求、候选人进展与业务风险/);
  assert.match(html, /✧ AI提取关键词/);
  assert.match(html, /＋ 新建公司/);
  assert.doesNotMatch(html, /AI 重新提取全部岗位关键词/);
});

test('talent library uses one unified search input for local and cloud resume search', () => {
  const unifiedSearchInputs = html.match(/<input[^>]*v-model="candidateFilters\.query"[^>]*>/g) || [];
  assert.equal(unifiedSearchInputs.length, 1);
  assert.match(unifiedSearchInputs[0], /aria-label="人才库专属搜索"/);
  assert.match(unifiedSearchInputs[0], /placeholder="搜索姓名、公司、岗位、简历"/);
  assert.match(unifiedSearchInputs[0], /@input="syncUnifiedTalentSearch"/);
  assert.match(unifiedSearchInputs[0], /@keyup\.enter="runUnifiedTalentSearch"/);
  assert.match(html, /talentCloudSearch\.query = query/);
  assert.match(html, /runUnifiedTalentSearch\(\)[\s\S]*?runTalentCloudSearch\(\)/);
  assert.doesNotMatch(html, /aria-label="搜索简历原文和文件名"/);
});
