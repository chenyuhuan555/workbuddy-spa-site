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

test('guest lifecycle branches before any real cache or cloud initialization', () => {
  const mounted = block('onMounted(async () => {', 'onBeforeUnmount(() => {');
  const guestBranch = mounted.indexOf('if (isGuestMode)');
  assert.ok(guestBranch >= 0, 'guest mode must have an explicit lifecycle branch');
  assert.ok(guestBranch < mounted.indexOf('loadAiConfig()'));
  assert.ok(guestBranch < mounted.indexOf('await localLoad()'));
  assert.ok(guestBranch < mounted.indexOf('await loadWorkbenchV2()'));
  assert.ok(guestBranch < mounted.indexOf('await initializePrivateTodos()'));
  assert.match(mounted, /await loadGuestWorkspace\(\)/);
  assert.match(mounted, /return;/);
});

test('authenticated startup kicks non-critical hydration tasks off in parallel', () => {
  const startup = block('function startBackgroundStartupTasks()', '// -------- 生命周期 --------');
  const mounted = block('onMounted(async () => {', 'onBeforeUnmount(() => {');

  assert.match(startup, /Promise\.allSettled\(/);
  for (const task of ['loadTeamTodos', 'loadDailyReview', 'localLoadKb', 'localLoadKbApiKey', 'hydrateResumesFromCache', 'loadQuantumRadarFromCloud']) {
    assert.match(startup, new RegExp(task));
  }
  assert.ok(mounted.indexOf('startBackgroundStartupTasks()') < mounted.indexOf('await initCloud()'));
  assert.doesNotMatch(mounted, /await loadQuantumRadarFromCloud\(\)/);
});

test('guest workspace load and save use only WorkBuddyGuestDemo', () => {
  const load = block('function loadGuestWorkspace()', 'async function saveGuestWorkspace()');
  const save = block('async function saveGuestWorkspace()', '// -------- localStorage 本地缓存 --------');

  assert.match(load, /guestDemo\.loadWorkspace\(\)/);
  assert.doesNotMatch(load, /loadAppSnapshot|localStorage\.getItem|WorkBuddySupabase|initCloud/);
  assert.match(save, /guestDemo\.saveWorkspace\(/);
  assert.doesNotMatch(save, /saveAppSnapshot|WorkBuddySupabase|schedulePush|kbApiKey/);
});

test('all primary persistence and cloud entry points fail closed in guest mode', () => {
  const localSave = block('async function localSave()', 'async function localLoad()');
  const workbenchSave = block('async function saveWorkbenchV2()', 'async function reconcileMigratedPositionDescriptions()');
  const schedulePush = block('function schedulePush(', 'async function doPush()');
  const initCloud = block('async function initCloud()', '// -------- 生命周期 --------');

  assert.match(localSave, /if \(isGuestMode\) return saveGuestWorkspace\(\)/);
  assert.match(workbenchSave, /if \(isGuestMode\) return saveGuestWorkspace\(\)/);
  assert.match(schedulePush, /!window\.WorkBuddyAccess\?\.canAccessCloud/);
  assert.match(initCloud, /if \(isGuestMode\) return;/);
});

test('guest save coordinator never falls through to live IndexedDB persistence', () => {
  const coordinator = block('createSaveCoordinator({', 'const stopSaveStateSubscription');
  const guestGuard = coordinator.indexOf('if (isGuestMode)');
  const liveSave = coordinator.indexOf("domains.has('legacy')");

  assert.ok(guestGuard >= 0 && guestGuard < liveSave);
  assert.match(coordinator, /await saveGuestWorkspace\(\)/);
  assert.match(coordinator, /return;/);
});

test('guest todo CRUD uses the local demo workspace instead of the Supabase todo client', () => {
  const client = block('function getPrivateTodoClient()', 'function replacePrivateTodos');
  const guestGuard = client.indexOf('if (isGuestMode)');
  const supabaseClient = client.indexOf('WorkBuddyPrivateTodos.createClient');

  assert.ok(guestGuard >= 0 && guestGuard < supabaseClient);
  assert.match(client, /saveGuestWorkspace\(\)/);
  assert.match(client, /privateTodos\.splice/);
});

test('guest UI cannot activate cloud resume search or construct its repository', () => {
  assert.match(html, /aria-labelledby="talent-cloud-search-title"/);
  assert.match(html, /isReady: \(\) => !isGuestMode && Boolean\(window\.WorkBuddySupabase/);
  const repo = block('function getResumeSearchRepo()', 'const CANDIDATE_FP_KEY');
  assert.match(repo, /if \(isGuestMode\) throw new Error\('GUEST_CLOUD_DISABLED'\)/);
});
