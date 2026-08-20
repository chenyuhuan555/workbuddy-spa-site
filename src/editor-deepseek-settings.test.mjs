import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const authBootstrap = fs.readFileSync(new URL('./auth-bootstrap.js', import.meta.url), 'utf8');
const pageScripts = `${html}\n${authBootstrap}`;

test('editors can open settings only for DeepSeek configuration', () => {
  assert.match(pageScripts, /canConfigureAi:\s*state\.profile\.role === 'admin' \|\| state\.profile\.role === 'editor'/);
  assert.match(html, /const canConfigureAi = window\.WorkBuddyAccess\?\.canConfigureAi === true/);
  assert.match(html, /filter\(item => canConfigureAi \|\| item\.key !== 'settings'\)/);
  assert.match(html, /workbenchNav === 'settings' && canConfigureAi/);
  assert.match(html, /data-settings-card="deepseek"/);
});

test('administrator-only settings remain isolated', () => {
  assert.match(html, /v-if="canManageMembers" data-settings-card="members"/);
  assert.match(html, /v-if="canManageMembers" data-settings-card="backup"/);
  assert.match(html, /if \(key === 'settings' && !canConfigureAi\) return/);
  assert.match(html, /if \(key === 'settings' && canManageMembers\) loadMembers\(\)/);
});

test('workbench nav rename candidates -> 人才库 is applied without breaking settings isolation', () => {
  assert.match(html, /key:\s*'candidates'[^}]*label:\s*'人才库'/, 'workbenchNavItems should label the candidates nav as 人才库');
});

test('positions and progress navigation use semantic icons instead of the settings gear', () => {
  const positionsIcon = html.indexOf("item.key === 'positions'");
  const progressIcon = html.indexOf("item.key === 'progress'");
  const settingsFallback = html.indexOf('<span v-else class="w-5 h-5 flex-shrink-0 flex items-center justify-center">');

  assert.ok(positionsIcon >= 0, '岗位库 should have a dedicated icon branch');
  assert.ok(progressIcon > positionsIcon, '面试进度 icon branch should follow 岗位库');
  assert.ok(settingsFallback > progressIcon, 'settings fallback should remain after dedicated icon branches');
  assert.match(html.slice(positionsIcon, progressIcon), /M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2/, '岗位库 should use a briefcase icon');
  assert.match(html.slice(progressIcon, settingsFallback), /M9 5h6m-4-2h2a2 2 0 012 2/, '面试进度 should use a checklist icon');
});
