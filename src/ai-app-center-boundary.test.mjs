import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

function block(start, end) {
  const from = html.indexOf(start);
  const to = html.indexOf(end, from + start.length);
  assert.ok(from >= 0, `missing start marker: ${start}`);
  assert.ok(to > from, `missing end marker: ${end}`);
  return html.slice(from, to);
}

test('AI应用中心脚本已注册且数据层脚本带缓存版本号', () => {
  assert.match(html, /<script src="\.\/src\/services\/ai-application-center\.js\?v=[^"]+"><\/script>/);
  assert.match(html, /<script src="\.\/src\/workbench-v2\.js\?v=[^"]+"><\/script>/);
  assert.match(html, /<script src="\.\/src\/services\/sync-merge\.js\?v=[^"]+"><\/script>/);
});

test('导航顺序：AI应用中心位于 AI工具箱之后、知识库之前', () => {
  const ai = html.indexOf("{ key: 'ai', label: 'AI工具箱'");
  const aiApps = html.indexOf("{ key: 'aiApps', label: 'AI应用中心'");
  const knowledge = html.indexOf("{ key: 'knowledge', label: '知识库'");
  assert.ok(ai >= 0, 'missing AI工具箱 nav item');
  assert.ok(aiApps > ai, 'AI应用中心 must come after AI工具箱');
  assert.ok(knowledge > aiApps, 'AI应用中心 must come before 知识库');
});

test('游客模式隐藏 AI应用中心：导航过滤与切换守卫 fail-closed', () => {
  const navItems = block('const workbenchNavItems = [', '];');
  assert.match(navItems, /!isGuestMode \|\| item\.key !== 'aiApps'/);
  const selectNav = block('function selectWorkbenchNav(', 'const workbenchEntityActions');
  assert.match(selectNav, /if \(key === 'aiApps' && isGuestMode\) return;/);
});

test('AI应用中心页面与弹窗存在，且管理操作受 canManageMembers 门禁', () => {
  assert.match(html, /workbenchNav === 'aiApps' && workbenchRoute\.type === 'list'/);
  assert.match(html, /v-if="aiAppForm\.open && canManageMembers"/);
  assert.match(html, /v-if="canManageMembers" @click="openAiAppCreate\(\)"/);
  assert.match(html, /v-if="canManageMembers" @click="openAiAppEdit\(app\)"/);
  const saveFn = block('async function saveAiAppForm()', 'async function deleteAiAppForm()');
  assert.match(saveFn, /if \(!canManageMembers \|\| isGuestMode/);
  const deleteFn = block('async function deleteAiAppForm()', 'const memberManagement');
  assert.match(deleteFn, /if \(!canManageMembers \|\| isGuestMode/);
  const createFn = block('function openAiAppCreate()', 'function openAiAppEdit(');
  assert.match(createFn, /if \(!canManageMembers \|\| isGuestMode\) return;/);
});

test('AI应用中心种子在 loadWorkbenchV2 生命周期注入且游客分支不受影响', () => {
  const loadV2 = block('function loadWorkbenchV2()', 'async function saveWorkbenchV2()');
  assert.match(loadV2, /AiAppCenter\.seedDefaultAiApplications\(workbenchV2\)/);
  const mounted = block('onMounted(async () => {', 'onBeforeUnmount(() => {');
  const guestBranch = mounted.indexOf('if (isGuestMode)');
  assert.ok(guestBranch >= 0 && guestBranch < mounted.indexOf('await loadWorkbenchV2()'));
});
