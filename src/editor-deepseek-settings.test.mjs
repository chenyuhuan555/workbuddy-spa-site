import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

test('editors can open settings only for DeepSeek configuration', () => {
  assert.match(html, /canConfigureAi:\s*state\.profile\.role === 'admin' \|\| state\.profile\.role === 'editor'/);
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
