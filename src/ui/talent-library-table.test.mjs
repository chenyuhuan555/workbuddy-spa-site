import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./talent-library-table.js');
const Table = globalThis.WorkBuddyTalentLibraryTable;

const companies = [
  { id: 'co-1', name: '智动未来' },
  { id: 'co-2', name: '深圳大数据研究院' },
  { id: 'co-3', name: 'XX机器人' },
];

const positions = [
  { id: 'pos-1', companyId: 'co-1', title: 'AI研究员' },
  { id: 'pos-2', companyId: 'co-2', title: '算法研究员' },
  { id: 'pos-3', companyId: 'co-3', title: '机器人算法' },
];

const candidate = {
  id: 'cand-1',
  name: '马悦驰',
  currentCompany: '博智林',
  currentTitle: '具身算法',
  city: '深圳',
  owner: '梓轩',
  education: '清华博士',
  summary: '清华博，做过 Sim2Real 和机械臂',
  skills: ['机器人', '强化学习'],
  tags: ['具身智能'],
  directions: ['机器人算法'],
  createdAt: '2026-08-10T02:00:00.000Z',
  extraFields: {
    年龄: '36',
    '期望base地': '广州',
    '薪酬信息（月薪+奖金+股票等其他激励）': '60w',
    '期望薪酬及依据': '合理涨幅',
    '换工作动机/诉求': '希望继续深耕具身领域',
  },
  resumeVersions: [{ rawText: '清华大学 机器人 Sim2Real' }],
};

test('buildCandidateRow maps direct and extraFields values without mutating Candidate', () => {
  const before = structuredClone(candidate);
  const row = Table.buildCandidateRow({ candidate, applications: [], positions, companies, stageLabel: value => value });

  assert.equal(row.age, '36');
  assert.equal(row.currentBase, '深圳');
  assert.equal(row.expectedBase, '广州');
  assert.equal(row.currentSalary, '60w');
  assert.equal(row.expectedSalary, '合理涨幅');
  assert.equal(row.motivation, '希望继续深耕具身领域');
  assert.equal(row.resumeSummary, '清华博，做过 Sim2Real 和机械臂');
  assert.equal(row.primaryFlow, null);
  assert.equal(row.extraFlowCount, 0);
  assert.deepEqual(candidate, before);
});

test('buildCandidateRow selects the latest active Application without collapsing Candidate status', () => {
  const applications = [
    { id: 'app-1', candidateId: 'cand-1', positionId: 'pos-1', companyId: 'co-1', stage: 'recommended', updatedAt: '2026-08-10T04:00:00.000Z' },
    {
      id: 'app-2',
      candidateId: 'cand-1',
      positionId: 'pos-2',
      companyId: 'co-2',
      stage: 'interview_pending',
      updatedAt: '2026-08-09T04:00:00.000Z',
      pipelineEvents: [
        { occurredAt: 'invalid' },
        { occurredAt: '2026-08-11T04:00:00.000Z' },
        { occurredAt: '2026-08-12T04:00:00.000Z' },
      ],
    },
    { id: 'app-3', candidateId: 'cand-1', positionId: 'pos-3', companyId: 'co-3', stage: 'closed', updatedAt: '2026-08-13T04:00:00.000Z' },
    { id: 'app-4', candidateId: 'cand-1', positionId: 'pos-3', companyId: 'co-3', stage: 'screening', updatedAt: '2026-08-11T04:00:00.000Z' },
  ];
  const candidateWithStatus = { ...candidate, status: 'active' };
  const row = Table.buildCandidateRow({ candidate: candidateWithStatus, applications, positions, companies, stageLabel: value => `阶段:${value}` });

  assert.deepEqual(row.primaryFlow, {
    applicationId: 'app-2',
    positionId: 'pos-2',
    companyName: '深圳大数据研究院',
    positionTitle: '算法研究员',
    stage: 'interview_pending',
    stageLabel: '阶段:interview_pending',
    businessAt: '2026-08-12T04:00:00.000Z',
  });
  assert.equal(row.extraFlowCount, 2);
  assert.equal(row.status, candidateWithStatus.status);
});

test('applicationBusinessAt skips invalid fallback dates', () => {
  const application = {
    pipelineEvents: [{ occurredAt: 'invalid-event-date' }],
    stageEnteredAt: 'invalid',
    updatedAt: '2026-08-12T04:00:00.000Z',
    createdAt: '2026-08-10T04:00:00.000Z',
  };

  assert.equal(Table.applicationBusinessAt(application), '2026-08-12T04:00:00.000Z');
});

test('candidateSearchText covers schools skills tags Base extraFields and resume text', () => {
  const text = Table.candidateSearchText(candidate).toLowerCase();

  for (const term of ['清华博士', '强化学习', '具身智能', '深圳', '广州', '合理涨幅', 'sim2real']) {
    assert.match(text, new RegExp(term.toLowerCase()));
  }
});

test('missing optional fields render as dash instead of throwing', () => {
  const row = Table.buildCandidateRow({ candidate: { id: 'empty', name: '空字段人才' }, applications: [], positions: [], companies: [] });

  for (const key of ['age', 'resumeSummary', 'currentBase', 'expectedBase', 'currentSalary', 'expectedSalary', 'motivation', 'owner', 'intakeAt']) {
    assert.equal(row[key], '-');
  }
});
