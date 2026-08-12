import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./talent-funnel-analytics.js');
const { buildTalentFunnelAnalytics } = globalThis.WorkBuddyTalentFunnelAnalytics;

function assertRate(actual, expected, message) {
  if (expected === null) {
    assert.equal(actual, null, message);
    return;
  }
  assert.ok(Math.abs(actual - expected) < 1e-12, `${message}，实际 ${actual}`);
}

test('按渠道聚合成功漏斗、过滤非试点事件、去重重复事件并输出卡点排序', () => {
  const channels = [
    { id: 'career_site', name: '外宣网站' },
    { id: 'referral', name: '内推' },
    { id: 'social', name: '社媒' },
  ];
  const events = [
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:05:00.000Z' },
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T09:00:00.000Z' },
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T10:00:00.000Z' },
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'interviewed', result: 'success', isPilot: true, occurredAt: '2026-08-11T11:00:00.000Z' },
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'offered', result: 'success', isPilot: true, occurredAt: '2026-08-11T12:00:00.000Z' },
    { applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'career_site', stage: 'hired', result: 'success', isPilot: true, occurredAt: '2026-08-11T13:00:00.000Z' },
    { applicationId: 'app_2', positionId: 'pos_2', companyId: 'co_A', channelId: 'career_site', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:10:00.000Z' },
    { applicationId: 'app_9', positionId: 'pos_9', companyId: 'co_A', channelId: 'career_site', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T09:10:00.000Z' },
    { applicationId: 'app_9', positionId: 'pos_9', companyId: 'co_A', channelId: 'career_site', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T09:20:00.000Z' },
    { applicationId: 'app_9', positionId: 'pos_9', companyId: 'co_A', channelId: 'career_site', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T09:30:00.000Z' },
    { applicationId: 'app_9', positionId: 'pos_9', companyId: 'co_A', channelId: 'career_site', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T09:35:00.000Z' },

    { applicationId: 'app_3', positionId: 'pos_3', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
    { applicationId: 'app_3', positionId: 'pos_3', companyId: 'co_A', channelId: 'referral', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:20:00.000Z' },
    { applicationId: 'app_3', positionId: 'pos_3', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:40:00.000Z' },
    { applicationId: 'app_3', positionId: 'pos_3', companyId: 'co_A', channelId: 'referral', stage: 'interviewed', result: 'success', isPilot: true, occurredAt: '2026-08-11T09:00:00.000Z' },
    { applicationId: 'app_3', positionId: 'pos_3', companyId: 'co_A', channelId: 'referral', stage: 'interviewed', result: 'failed', reasonCode: 'interview_failed', isPilot: true, occurredAt: '2026-08-11T09:30:00.000Z' },
    { applicationId: 'app_4', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:05:00.000Z' },
    { applicationId: 'app_4', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:25:00.000Z' },
    { applicationId: 'app_4', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'contacted', result: 'failed', reasonCode: 'cannot_contact', isPilot: true, occurredAt: '2026-08-11T08:35:00.000Z' },
    { applicationId: 'app_5', positionId: 'pos_5', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:15:00.000Z' },
    { applicationId: 'app_5', positionId: 'pos_5', companyId: 'co_A', channelId: 'referral', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:30:00.000Z' },
    { applicationId: 'app_5', positionId: 'pos_5', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:45:00.000Z' },
    { applicationId: 'app_5', positionId: 'pos_5', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T09:10:00.000Z' },
    { applicationId: 'app_6', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:18:00.000Z' },
    { applicationId: 'app_6', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:33:00.000Z' },
    { applicationId: 'app_6', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:50:00.000Z' },
    { applicationId: 'app_6', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T09:12:00.000Z' },
    { applicationId: 'app_6', positionId: 'pos_4', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T09:14:00.000Z' },
    { applicationId: 'app_7', positionId: 'pos_7', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:12:00.000Z' },
    { applicationId: 'app_7', positionId: 'pos_7', companyId: 'co_A', channelId: 'referral', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:27:00.000Z' },
    { applicationId: 'app_7', positionId: 'pos_7', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:42:00.000Z' },
    { applicationId: 'app_7', positionId: 'pos_7', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'failed', reasonCode: 'role_requirements_changed', isPilot: true, occurredAt: '2026-08-11T09:16:00.000Z' },

    { applicationId: 'app_old', positionId: 'pos_old', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-10T23:59:59.000Z' },
    { applicationId: 'app_other_company', positionId: 'pos_other', companyId: 'co_B', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
    { applicationId: 'app_not_pilot', positionId: 'pos_np', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: false, occurredAt: '2026-08-11T08:00:00.000Z' },
  ];

  const analytics = buildTalentFunnelAnalytics({
    events,
    channels,
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
  });

  assert.equal(analytics.channels.length, 3);

  assert.deepEqual(analytics.channels[0].counts, {
    imported: 3,
    contacted: 2,
    matched: 2,
    interviewed: 1,
    offered: 1,
    hired: 1,
  });
  assertRate(analytics.channels[0].adjacentRates.importedToContacted, 2 / 3, 'career_site importedToContacted');
  assertRate(analytics.channels[0].adjacentRates.contactedToMatched, 1, 'career_site contactedToMatched');
  assertRate(analytics.channels[0].adjacentRates.matchedToInterviewed, 1 / 2, 'career_site matchedToInterviewed');
  assertRate(analytics.channels[0].adjacentRates.interviewedToOffered, 1, 'career_site interviewedToOffered');
  assertRate(analytics.channels[0].adjacentRates.offeredToHired, 1, 'career_site offeredToHired');
  assertRate(analytics.channels[0].cumulativeRates.importedToContacted, 2 / 3, 'career_site importedToContacted cumulative');
  assertRate(analytics.channels[0].cumulativeRates.importedToMatched, 2 / 3, 'career_site importedToMatched cumulative');
  assertRate(analytics.channels[0].cumulativeRates.importedToInterviewed, 1 / 3, 'career_site importedToInterviewed cumulative');
  assertRate(analytics.channels[0].cumulativeRates.importedToOffered, 1 / 3, 'career_site importedToOffered cumulative');
  assertRate(analytics.channels[0].cumulativeRates.importedToHired, 1 / 3, 'career_site importedToHired cumulative');

  assert.deepEqual(analytics.channels[1].counts, {
    imported: 5,
    contacted: 5,
    matched: 4,
    interviewed: 1,
    offered: 0,
    hired: 0,
  });
  assertRate(analytics.channels[1].adjacentRates.importedToContacted, 1, 'referral importedToContacted');
  assertRate(analytics.channels[1].adjacentRates.contactedToMatched, 4 / 5, 'referral contactedToMatched');
  assertRate(analytics.channels[1].adjacentRates.matchedToInterviewed, 1 / 4, 'referral matchedToInterviewed');
  assertRate(analytics.channels[1].adjacentRates.interviewedToOffered, 0, 'referral interviewedToOffered');
  assertRate(analytics.channels[1].adjacentRates.offeredToHired, null, 'referral offeredToHired');
  assertRate(analytics.channels[1].cumulativeRates.importedToContacted, 1, 'referral importedToContacted cumulative');
  assertRate(analytics.channels[1].cumulativeRates.importedToMatched, 4 / 5, 'referral importedToMatched cumulative');
  assertRate(analytics.channels[1].cumulativeRates.importedToInterviewed, 1 / 5, 'referral importedToInterviewed cumulative');
  assertRate(analytics.channels[1].cumulativeRates.importedToOffered, 0, 'referral importedToOffered cumulative');
  assertRate(analytics.channels[1].cumulativeRates.importedToHired, 0, 'referral importedToHired cumulative');

  assert.deepEqual(analytics.channels[2], {
    channelId: 'social',
    channelName: '社媒',
    counts: { imported: 0, contacted: 0, matched: 0, interviewed: 0, offered: 0, hired: 0 },
    adjacentRates: {
      importedToContacted: null,
      contactedToMatched: null,
      matchedToInterviewed: null,
      interviewedToOffered: null,
      offeredToHired: null,
    },
    cumulativeRates: {
      importedToContacted: null,
      importedToMatched: null,
      importedToInterviewed: null,
      importedToOffered: null,
      importedToHired: null,
    },
  });

  assert.deepEqual(analytics.bottlenecks, [
    {
      stage: 'matched',
      dropCount: 4,
      dropRate: 4 / 10,
      reasonCounts: [
        { reasonCode: 'salary_mismatch', count: 3 },
        { reasonCode: 'role_requirements_changed', count: 1 },
      ],
      channelCount: 2,
      positionCount: 4,
    },
    {
      stage: 'interviewed',
      dropCount: 1,
      dropRate: 1 / 3,
      reasonCounts: [{ reasonCode: 'interview_failed', count: 1 }],
      channelCount: 1,
      positionCount: 1,
    },
    {
      stage: 'contacted',
      dropCount: 1,
      dropRate: 1 / 8,
      reasonCounts: [{ reasonCode: 'cannot_contact', count: 1 }],
      channelCount: 1,
      positionCount: 1,
    },
  ]);
});

test('小样本在非零分母时返回 0，零分母时返回 null 而不是 Infinity 或 NaN', () => {
  const analytics = buildTalentFunnelAnalytics({
    channels: [{ id: 'solo', name: '单渠道' }],
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
    events: [
      { applicationId: 'app_1', companyId: 'co_A', channelId: 'solo', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
    ],
  });

  const item = analytics.channels[0];
  assert.equal(item.counts.imported, 1);
  assert.equal(item.counts.contacted, 0);
  assert.equal(item.adjacentRates.importedToContacted, 0);
  assert.equal(item.adjacentRates.contactedToMatched, null);
  assert.equal(item.cumulativeRates.importedToMatched, 0);
  assert.equal(item.cumulativeRates.importedToHired, 0);
  assert.equal(item.adjacentRates.contactedToMatched === Infinity, false);
  assert.equal(Number.isNaN(item.adjacentRates.contactedToMatched), false);
});

test('events 为空时指定渠道仍返回完整零值结构，全部转化率为 null，且无 bottlenecks', () => {
  const analytics = buildTalentFunnelAnalytics({
    events: [],
    channels: [{ id: 'career_site', name: '外宣网站' }],
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
  });

  assert.deepEqual(analytics.channels, [{
    channelId: 'career_site',
    channelName: '外宣网站',
    counts: {
      imported: 0,
      contacted: 0,
      matched: 0,
      interviewed: 0,
      offered: 0,
      hired: 0,
    },
    adjacentRates: {
      importedToContacted: null,
      contactedToMatched: null,
      matchedToInterviewed: null,
      interviewedToOffered: null,
      offeredToHired: null,
    },
    cumulativeRates: {
      importedToContacted: null,
      importedToMatched: null,
      importedToInterviewed: null,
      importedToOffered: null,
      importedToHired: null,
    },
  }]);
  assert.deepEqual(analytics.bottlenecks, []);
});

test('同 applicationId+stage+result 的冲突事件按 occurredAt、id 的确定性顺序去重，交换输入顺序后 analytics 保持一致', () => {
  const channels = [
    { id: 'career_site', name: '外宣网站' },
    { id: 'referral', name: '内推' },
  ];
  const baseEvents = [
    { id: 'evt_success_imported', applicationId: 'app_1', positionId: 'pos_seed', companyId: 'co_A', channelId: 'referral', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
    { id: 'evt_success_matched', applicationId: 'app_1', positionId: 'pos_seed', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:30:00.000Z' },
  ];
  const failedEarlier = {
    id: 'evt_a',
    applicationId: 'app_1',
    positionId: 'pos_keep',
    companyId: 'co_A',
    channelId: 'referral',
    stage: 'matched',
    result: 'failed',
    reasonCode: 'salary_mismatch',
    isPilot: true,
    occurredAt: '2026-08-11T09:00:00.000Z',
  };
  const failedLater = {
    id: 'evt_b',
    applicationId: 'app_1',
    positionId: 'pos_drop',
    companyId: 'co_A',
    channelId: 'career_site',
    stage: 'matched',
    result: 'failed',
    reasonCode: 'role_requirements_changed',
    isPilot: true,
    occurredAt: '2026-08-11T09:05:00.000Z',
  };

  const analyticsA = buildTalentFunnelAnalytics({
    events: [...baseEvents, failedLater, failedEarlier],
    channels,
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
  });
  const analyticsB = buildTalentFunnelAnalytics({
    events: [...baseEvents, failedEarlier, failedLater],
    channels,
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
  });

  assert.deepEqual(analyticsA, analyticsB);
  assert.deepEqual(analyticsA.bottlenecks, [{
    stage: 'matched',
    dropCount: 1,
    dropRate: 1 / 2,
    reasonCounts: [{ reasonCode: 'salary_mismatch', count: 1 }],
    channelCount: 1,
    positionCount: 1,
  }]);
});

test('未知 channelId 的成功和失败事件都被排除，不进入 channels 或 bottlenecks', () => {
  const analytics = buildTalentFunnelAnalytics({
    channels: [{ id: 'known', name: '已知渠道' }],
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
    events: [
      { id: 'evt_known_imported', applicationId: 'app_known', positionId: 'pos_known', companyId: 'co_A', channelId: 'known', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
      { id: 'evt_unknown_imported', applicationId: 'app_unknown_1', positionId: 'pos_unknown_1', companyId: 'co_A', channelId: 'unknown', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:05:00.000Z' },
      { id: 'evt_unknown_failed', applicationId: 'app_unknown_2', positionId: 'pos_unknown_2', companyId: 'co_A', channelId: 'unknown', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T08:10:00.000Z' },
    ],
  });

  assert.deepEqual(analytics.channels, [{
    channelId: 'known',
    channelName: '已知渠道',
    counts: {
      imported: 1,
      contacted: 0,
      matched: 0,
      interviewed: 0,
      offered: 0,
      hired: 0,
    },
    adjacentRates: {
      importedToContacted: 0,
      contactedToMatched: null,
      matchedToInterviewed: null,
      interviewedToOffered: null,
      offeredToHired: null,
    },
    cumulativeRates: {
      importedToContacted: 0,
      importedToMatched: 0,
      importedToInterviewed: 0,
      importedToOffered: 0,
      importedToHired: 0,
    },
  }]);
  assert.deepEqual(analytics.bottlenecks, []);
});

test('候选人尚未匹配岗位时，只有 candidateId 的已导入事件也计入渠道漏斗', () => {
  const analytics = buildTalentFunnelAnalytics({
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
    channels: [{ id: 'beiluo', name: '倍罗' }],
    events: [{
      id: 'evt_candidate_import', candidateId: 'cand_1', companyId: 'co_A', channelId: 'beiluo',
      stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z',
    }],
  });
  assert.equal(analytics.channels[0].counts.imported, 1);
});

test('bottleneck dropRate 使用 failed / (success + failed) 的有界比例，不会大于 1', () => {
  const analytics = buildTalentFunnelAnalytics({
    channels: [{ id: 'referral', name: '内推' }],
    companyId: 'co_A',
    baselineAt: '2026-08-11T00:00:00.000Z',
    events: [
      { id: 'evt_failed_1', applicationId: 'app_1', positionId: 'pos_1', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
      { id: 'evt_failed_2', applicationId: 'app_2', positionId: 'pos_2', companyId: 'co_A', channelId: 'referral', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T08:05:00.000Z' },
    ],
  });

  assert.deepEqual(analytics.bottlenecks, [{
    stage: 'matched',
    dropCount: 2,
    dropRate: 1,
    reasonCounts: [{ reasonCode: 'salary_mismatch', count: 2 }],
    channelCount: 1,
    positionCount: 2,
  }]);
  assert.ok(analytics.bottlenecks.every(item => item.dropRate === null || item.dropRate <= 1));
});

test('package.json 的 npm test 显式包含 talent funnel analytics Task 4 测试', () => {
  const pkg = JSON.parse(fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.match(pkg.scripts.test, /src\/services\/talent-funnel-analytics\.test\.mjs/);
});
