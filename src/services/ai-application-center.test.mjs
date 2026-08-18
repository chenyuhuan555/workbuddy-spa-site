import assert from 'node:assert/strict';
import test from 'node:test';

await import('./ai-application-center.js');
await import('./sync-merge.js');

const api = globalThis.WorkBuddyAiAppCenter;
const SyncMerge = globalThis.WorkBuddySyncMerge;

test('normalizeApplication 补齐默认值并清洗字段', () => {
  const app = api.normalizeApplication({
    name: '  演示应用  ',
    url: ' https://example.com ',
    status: '已上线',
    progress: 150,
    changelog: [{ text: ' 上线首页 ' }, { text: '   ' }, 'invalid'],
  }, { now: '2026-08-07T00:00:00.000Z' });
  assert.equal(app.name, '演示应用');
  assert.equal(app.url, 'https://example.com');
  assert.equal(app.status, 'released');
  assert.equal(app.progress, 100);
  assert.equal(app.changelog.length, 1);
  assert.equal(app.changelog[0].text, '上线首页');
  assert.equal(app.createdAt, '2026-08-07T00:00:00.000Z');
  assert.equal(app.updatedAt, '2026-08-07T00:00:00.000Z');
  assert.equal(app.deletedAt, '');
  assert.match(app.id, /^aiapp_/);
});

test('normalizeApplication 兼容历史中文状态且进度向下截断', () => {
  assert.equal(api.normalizeApplication({ status: '建设中' }).status, 'building');
  assert.equal(api.normalizeApplication({ progress: -20 }).progress, 0);
  assert.equal(api.normalizeApplication({ progress: '62.4' }).progress, 62);
  assert.equal(api.normalizeApplication({ progress: 'abc' }).progress, 0);
});

test('validateApplicationForm 覆盖必填与链接格式', () => {
  const base = { name: '小蜜蜂', url: 'https://example.com', status: 'building' };
  assert.equal(api.validateApplicationForm(base), '');
  assert.match(api.validateApplicationForm({ ...base, name: '  ' }), /应用名称/);
  assert.match(api.validateApplicationForm({ ...base, url: '' }), /应用链接/);
  assert.match(api.validateApplicationForm({ ...base, url: 'ftp://x' }), /http/);
  assert.match(api.validateApplicationForm({ ...base, status: 'unknown' }), /状态/);
});

test('resolveIcon 优先自有图标，其次类型映射，最后回退默认', () => {
  assert.equal(api.resolveIcon({ icon: '🐝', category: '招聘工作台' }), '🐝');
  assert.equal(api.resolveIcon({ category: '人才关系图谱' }), '🕸️');
  assert.equal(api.resolveIcon({ category: '行业人才网络' }), '🌐');
  assert.equal(api.resolveIcon({ category: '招聘工作台' }), '💼');
  assert.equal(api.resolveIcon({ category: '未知类型' }), api.DEFAULT_ICON);
  assert.equal(api.resolveIcon({}), api.DEFAULT_ICON);
});

test('visibleApplications 与 sortApplications 过滤软删除并按更新时间倒序', () => {
  const apps = [
    { id: 'a', updatedAt: '2026-08-01T00:00:00.000Z', createdAt: '' },
    { id: 'b', updatedAt: '2026-08-05T00:00:00.000Z', createdAt: '', deletedAt: '2026-08-06T00:00:00.000Z' },
    { id: 'c', updatedAt: '2026-08-03T00:00:00.000Z', createdAt: '' },
  ];
  assert.deepEqual(api.visibleApplications(apps).map(item => item.id), ['a', 'c']);
  assert.deepEqual(api.sortApplications(apps).map(item => item.id), ['c', 'a']);
});

test('computeStats 统计总数/建设中/已上线/最近更新', () => {
  const apps = [
    { id: 'a', status: 'building', updatedAt: '2026-08-01T00:00:00.000Z' },
    { id: 'b', status: 'released', updatedAt: '2026-08-06T00:00:00.000Z' },
    { id: 'c', status: 'building', updatedAt: '2026-08-03T00:00:00.000Z', deletedAt: '2026-08-04T00:00:00.000Z' },
  ];
  const stats = api.computeStats(apps);
  assert.equal(stats.total, 2);
  assert.equal(stats.building, 1);
  assert.equal(stats.released, 1);
  assert.equal(stats.lastUpdatedAt, '2026-08-06T00:00:00.000Z');
  assert.deepEqual(api.computeStats([]), { total: 0, building: 0, released: 0, lastUpdatedAt: '' });
});

test('seedDefaultAiApplications 首次播种三个应用并写入种子标记', () => {
  const bundle = { schemaVersion: 2, aiApplications: [], settings: {} };
  const seeded = api.seedDefaultAiApplications(bundle, { now: '2026-08-07T00:00:00.000Z' });
  assert.equal(seeded, true);
  assert.equal(bundle.aiApplications.length, 3);
  assert.equal(bundle.settings[api.SEED_FLAG_KEY], '2026-08-07T00:00:00.000Z');
  const names = bundle.aiApplications.map(item => item.name);
  assert.deepEqual(names, ['小蜜蜂·人才关系网', '量子人才网络', 'Quantum Talent工作台']);
  const first = bundle.aiApplications[0];
  assert.equal(first.url, 'https://chenyuhuan555.github.io/talent-graph/persons/?domain=ai');
  assert.equal(first.category, '人才关系图谱');
  assert.equal(first.status, 'building');
  assert.equal(first.progress, 70);
  assert.equal(first.createdAt, '2026-08-07T00:00:00.000Z');
});

test('seedDefaultAiApplications 幂等：删除全部应用后不会再次播种', () => {
  const bundle = { schemaVersion: 2, aiApplications: [], settings: {} };
  assert.equal(api.seedDefaultAiApplications(bundle), true);
  assert.equal(api.seedDefaultAiApplications(bundle), false);
  // 管理员删光应用（保留种子标记）后不应复活
  bundle.aiApplications = [];
  assert.equal(api.seedDefaultAiApplications(bundle), false);
  assert.equal(bundle.aiApplications.length, 0);
  assert.equal(api.seedDefaultAiApplications(null), false);
});

test('normalizeChangelog 过滤空文案并保留日期前10位', () => {
  const entries = api.normalizeChangelog([
    { date: '2026-08-07T12:00:00.000Z', text: ' 完成首页改版 ' },
    { date: '', text: '' },
  ]);
  assert.equal(entries.length, 1);
  assert.equal(entries[0].date, '2026-08-07');
  assert.equal(entries[0].text, '完成首页改版');
  assert.match(entries[0].id, /^chl_/);
});

test('statusLabel 与 STATUS_OPTIONS 一致', () => {
  assert.equal(api.statusLabel('building'), '建设中');
  assert.equal(api.statusLabel('released'), '已上线');
  assert.equal(api.statusLabel('其他'), '建设中');
  assert.deepEqual(api.STATUS_KEYS, ['building', 'released']);
});

test('sync-merge 冲突合并覆盖 aiApplications 集合', () => {
  const local = {
    workbenchV2: {
      companies: [], positions: [], candidates: [], applications: [],
      aiApplications: [
        { id: 'aiapp_1', name: '本地更新', updatedAt: '2026-08-07T00:00:00.000Z' },
        { id: 'aiapp_2', name: '本地独有', updatedAt: '2026-08-01T00:00:00.000Z' },
      ],
    },
  };
  const remote = {
    workbenchV2: {
      companies: [], positions: [], candidates: [], applications: [],
      aiApplications: [
        { id: 'aiapp_1', name: '云端较新', updatedAt: '2026-08-08T00:00:00.000Z' },
        { id: 'aiapp_3', name: '云端独有', updatedAt: '2026-08-02T00:00:00.000Z' },
      ],
    },
  };
  const merged = SyncMerge.mergeWorkspaceStates(local, remote);
  const byId = Object.fromEntries(merged.workbenchV2.aiApplications.map(item => [item.id, item]));
  assert.equal(byId.aiapp_1.name, '云端较新');
  assert.equal(byId.aiapp_2.name, '本地独有');
  assert.equal(byId.aiapp_3.name, '云端独有');
  assert.equal(merged._mergeStats.fromCloud >= 2, true);
});
