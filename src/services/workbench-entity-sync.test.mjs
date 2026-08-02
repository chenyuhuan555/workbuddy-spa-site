import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('Phase 3 具备三类实体双写和迁移入口', () => {
  assert.match(html, /src\/services\/repo\/workbench-entity-repo\.js\?v=/);
  assert.match(html, /syncWorkbenchEntitiesWithCloud/);
  assert.match(html, /runWorkbenchEntityMigration/);
  assert.match(html, /verifyWorkbenchEntityParity/);
  assert.match(html, /enableWorkbenchEntityCloudReadPath/);
  assert.match(html, /workbenchEntityReadPathEnabled/);
  assert.match(html, /requireWorkbenchEntityRowsSynced/);
  assert.match(html, /workbenchEntityMigrationMeta/);
  assert.match(html, /companies\s*\/\s*positions\s*\/\s*applications/);
});

test('Phase 3 双写不改变当前 workspace_state 读取来源', () => {
  assert.match(html, /Phase 3 · 仅双写，不切读/);
  assert.match(html, /if \(workbenchEntityReadPathEnabled\.value\)[\s\S]{0,500}loadWorkbenchEntitiesFromCloudAsAuthority/);
});
