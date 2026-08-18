import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./position-library-table.js');
const Table = globalThis.WorkBuddyPositionLibraryTable;

const companies = [
  { id: 'co-1', name: '智动未来' },
  { id: 'co-2', name: '深圳大数据研究院' },
];

const positions = [
  { id: 'pos-1', companyId: 'co-1', title: 'AI 研究员', city: '北京', salary: '40-60k', owner: '梓轩', status: 'open', tags: ['大模型'], description: '负责大模型训练与推理优化，要求有分布式训练经验。' },
  { id: 'pos-2', companyId: 'co-2', title: '算法研究员', city: '深圳', salary: '面议', owner: '一鸣', status: 'paused', tags: ['机器人'], description: '机器人运动控制算法，强化学习方向。' },
  { id: 'pos-3', companyId: 'co-1', title: '数据科学家', city: '上海', salary: '30-50k', owner: '梓轩', status: 'closed' },
];

const applications = [
  { id: 'app-1', positionId: 'pos-1', candidateId: 'cand-1', stage: 'recommended' },
  { id: 'app-2', positionId: 'pos-1', candidateId: 'cand-2', stage: 'client_accepted' },
  { id: 'app-3', positionId: 'pos-1', candidateId: 'cand-3', stage: 'interviewing' },
  { id: 'app-4', positionId: 'pos-1', candidateId: 'cand-4', stage: 'offer_accepted' },
  { id: 'app-5', positionId: 'pos-1', candidateId: 'cand-5', stage: 'onboarded' },
  { id: 'app-6', positionId: 'pos-1', candidateId: 'cand-6', stage: 'discovered' },
  { id: 'app-7', positionId: 'pos-1', candidateId: 'cand-7', stage: 'screening' },
  { id: 'app-8', positionId: 'pos-1', candidateId: 'cand-8', stage: 'closed' },
  { id: 'app-9', positionId: 'pos-1', candidateId: 'cand-9', stage: 'recommended', deletedAt: '2026-08-01T00:00:00.000Z' },
  { id: 'app-10', positionId: 'pos-2', candidateId: 'cand-10', stage: 'interview_pending', status: 'archived' },
  { id: 'app-11', positionId: 'pos-3', candidateId: 'cand-11', stage: 'interviewing' },
];

test('STATUS_LABELS 映射三种岗位状态', () => {
  assert.deepEqual(Table.STATUS_LABELS, { open: '开放中', paused: '暂停', closed: '已关闭' });
  assert.deepEqual([...Table.STATUS_VALUES], ['open', 'paused', 'closed']);
});

test('computePositionProgress 按阶段分组计数并排除归档/软删/未推进', () => {
  const progress = Table.computePositionProgress(applications.filter(a => a.positionId === 'pos-1'));
  assert.equal(progress.recommended, 1);   // 仅 app-1（app-9 已软删，不计）
  assert.equal(progress.clientReview, 1);  // app-2
  assert.equal(progress.interviewing, 1);  // app-3
  assert.equal(progress.offer, 1);         // app-4(offer_accepted)
  assert.equal(progress.onboarded, 1);     // app-5
  assert.equal(progress.total, 5);         // 不含 discovered/screening/closed/已软删
});

test('computePositionProgress 忽略 archived 推进记录', () => {
  const progress = Table.computePositionProgress(applications.filter(a => a.positionId === 'pos-2'));
  assert.equal(progress.interviewing, 0);
});

test('jdPreview 折叠空白并截断，空 JD 返回空串', () => {
  assert.equal(Table.jdPreview(positions[0]), '负责大模型训练与推理优化，要求有分布式训练经验。');
  assert.equal(Table.jdPreview({ description: '  '.padEnd(0) + '第一章\n第二章   第三章' }, 10), '第一章 第二章 第三章'.slice(0, 10) + '…');
  assert.equal(Table.jdPreview({}), '');
  const long = { description: 'x'.repeat(80) };
  assert.equal(Table.jdPreview(long, 20).length, 21); // 20 + '…'
  assert.ok(Table.jdPreview(long, 20).endsWith('…'));
});

test('filterRows 支持 query 覆盖岗位名/公司名/JD/技能', () => {
  const rows = Table.buildRows({ positions, companies, applications });
  const now = new Date('2026-08-13T12:00:00+08:00');
  assert.equal(Table.filterRows(rows, { query: '大模型' }, now).length, 1);
  assert.equal(Table.filterRows(rows, { query: '智动未来' }, now).length, 2);
  assert.equal(Table.filterRows(rows, { query: '机器人' }, now).length, 1);
  assert.equal(Table.filterRows(rows, { query: '不存在的关键词' }, now).length, 0);
});

test('filterRows 按 companyId / status / owner / base / tag 过滤', () => {
  const rows = Table.buildRows({ positions, companies, applications });
  const now = new Date('2026-08-13T12:00:00+08:00');
  assert.equal(Table.filterRows(rows, { companyId: 'co-1' }, now).length, 2);
  assert.equal(Table.filterRows(rows, { status: 'paused' }, now).length, 1);
  assert.equal(Table.filterRows(rows, { owner: '梓轩' }, now).length, 2);
  assert.equal(Table.filterRows(rows, { base: '深圳' }, now).length, 1);
  assert.equal(Table.filterRows(rows, { tag: '大模型' }, now).length, 1);
  assert.equal(Table.filterRows(rows, { tag: '不存在' }, now).length, 0);
});

test('filterRows 按薪资区间与有无推荐/面试过滤', () => {
  const rows = Table.buildRows({ positions, companies, applications });
  const now = new Date('2026-08-13T12:00:00+08:00');
  // pos-1: 40-60k → 40；pos-2: 面议 → NaN；pos-3: 30-50k → 30
  assert.equal(Table.filterRows(rows, { salaryMin: 35 }, now).length, 1); // 仅 40（30、面议被排除）
  assert.equal(Table.filterRows(rows, { salaryMax: 35 }, now).length, 1); // 仅 30
  assert.equal(Table.filterRows(rows, { hasRecommendation: 'yes' }, now).length, 1); // pos-1
  assert.equal(Table.filterRows(rows, { hasRecommendation: 'no' }, now).length, 2);   // pos-2、pos-3
  assert.equal(Table.filterRows(rows, { hasInterview: 'yes' }, now).length, 2); // pos-1、pos-3（onboarded 不计 interview）
});

test('filterRows 支持创建/更新日期预设', () => {
  const dated = [
    { id: 'p', searchText: '', companyId: 'co-1', status: 'open', tags: [], progress: {}, createdAt: '2026-08-10T02:00:00.000Z', updatedAt: '2026-08-12T02:00:00.000Z' },
  ];
  const now = new Date('2026-08-13T12:00:00+08:00');
  assert.equal(Table.filterRows(dated, { created: { preset: 'week' } }, now).length, 1);
  assert.equal(Table.filterRows(dated, { created: { preset: 'today' } }, now).length, 0);
  assert.equal(Table.filterRows(dated, { updated: { preset: 'month' } }, now).length, 1);
});

test('buildRows 映射岗位为行且不改动原始对象', () => {
  const before = structuredClone(positions);
  const rows = Table.buildRows({ positions, companies, applications });
  assert.equal(rows.length, 3);
  const row1 = rows[0];
  assert.equal(row1.title, 'AI 研究员');
  assert.equal(row1.companyName, '智动未来');
  assert.equal(row1.base, '北京');
  assert.equal(row1.statusLabel, '开放中');
  assert.equal(row1.recommended, 1);
  assert.equal(row1.interviewing, 1);
  assert.equal(row1.progress.onboarded, 1);
  assert.ok(row1.jdPreview.length > 0 && row1.jdPreview.length <= 49);
  assert.deepEqual(positions, before);
});

test('buildRows 缺失字段显示为 dash 且不抛错', () => {
  const row = Table.buildPositionRow({ position: { id: 'empty' }, company: {} });
  assert.equal(row.title, '-');
  assert.equal(row.base, '-');
  assert.equal(row.salary, '-');
  assert.equal(row.owner, '-');
  assert.equal(row.statusLabel, '开放中');
  assert.equal(row.jdPreview, '');
  assert.deepEqual(row.progress, { recommended: 0, clientReview: 0, interviewing: 0, offer: 0, onboarded: 0, total: 0 });
});

test('summarize 按状态与推荐/面试汇总', () => {
  const rows = Table.buildRows({ positions, companies, applications });
  assert.deepEqual(Table.summarize(rows), {
    total: 3, open: 1, paused: 1, closed: 1, recommended: 1, interviewing: 2,
  });
});
