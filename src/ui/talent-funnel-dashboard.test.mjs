import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

globalThis.window = globalThis;
await import('../services/talent-funnel-analytics.js');
await import('./talent-funnel-dashboard.js');

const { buildTalentFunnelAnalytics } = globalThis.WorkBuddyTalentFunnelAnalytics;
const {
  SECTION_ORDER,
  buildTalentFunnelDashboardModel,
  createTalentFunnelDashboardController,
} = globalThis.WorkBuddyTalentFunnelDashboard;
const INDEX_HTML = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

const channels = [
  { id: 'career_site', name: '外宣网站' },
  { id: 'community', name: '技术社区' },
];

const events = [
  { id: 'a-imported', applicationId: 'app-a', companyId: 'company-a', channelId: 'career_site', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
  { id: 'a-contacted', applicationId: 'app-a', companyId: 'company-a', channelId: 'career_site', stage: 'contacted', result: 'success', isPilot: true, occurredAt: '2026-08-11T09:00:00.000Z' },
  { id: 'a-matched', applicationId: 'app-a', companyId: 'company-a', channelId: 'career_site', stage: 'matched', result: 'failed', reasonCode: 'salary_mismatch', isPilot: true, occurredAt: '2026-08-11T10:00:00.000Z' },
  { id: 'b-imported', applicationId: 'app-b', companyId: 'company-b', channelId: 'community', stage: 'imported', result: 'success', isPilot: true, occurredAt: '2026-08-11T08:00:00.000Z' },
];

test('默认试点范围包含中科量枢并从今天开始统计新增事件', () => {
  assert.match(INDEX_HTML, /String\(company\.name \|\| ''\)\.trim\(\) === '中科量枢'/);
  assert.match(INDEX_HTML, /'2026-08-12T00:00:00\+08:00'/);
});

test('首页渠道卡片将查看详情与导入人才拆分', () => {
  assert.match(INDEX_HTML, /@click="openHomeFunnelChannelDetails\(channel\)"/);
  assert.match(INDEX_HTML, /@click="openHomeFunnelChannelImport\(channel\)"/);
  assert.doesNotMatch(INDEX_HTML, /@click="openHomeFunnelChannel\(channel\)"/);
  assert.match(INDEX_HTML, /渠道详情/);
  assert.match(INDEX_HTML, /@click="exportChannelDetails"/);
  assert.match(INDEX_HTML, /v-for="candidate in homeChannelDetailCandidates"/);
  assert.doesNotMatch(INDEX_HTML, /homeChannelDetailCandidates\.slice\(0, 8\)/);
  assert.doesNotMatch(INDEX_HTML, /仅展示最近 8 人/);
});

test('公司漏斗结论区不再显示独立的 AI 优化建议提示块', () => {
  assert.doesNotMatch(INDEX_HTML, /AI 优化建议/);
  assert.doesNotMatch(INDEX_HTML, /系统统计事实不会被 AI 修改/);
});

test('公司编辑支持修改名称，顾问助手头像编辑菜单支持隐藏', () => {
  assert.match(INDEX_HTML, /id="wb-company-profile-name"/);
  assert.match(INDEX_HTML, /companyProfileEdit\.name/);
  assert.match(INDEX_HTML, /隐藏顾问助手/);
  assert.match(INDEX_HTML, /@click="hideAdvisorPanel"/);
  assert.match(INDEX_HTML, /!advisorPanel\.meetingArticle && !advisorPanel\.hidden/);
});

test('工作台首页按渠道漏斗、今日待办、今日复盘分层', () => {
  const dashboard = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.ok(dashboard, 'dashboard template should exist');
  assert.ok(dashboard.indexOf('id="home-talent-funnel-title"') < dashboard.indexOf('id="home-todo-title"'));
  assert.ok(dashboard.indexOf('id="home-todo-title"') < dashboard.indexOf('id="home-review-title"'));
  assert.match(dashboard, /homeFunnelTimeRange/);
  assert.match(dashboard, /homeFunnelStageSummary/);
  assert.match(dashboard, /openTalentIntake/);
  assert.match(dashboard, /openHomeFunnelChannelImport\(channel\)/);
  assert.match(dashboard, /filteredHomeTodos\.slice\(0, 6\)/);
  assert.match(dashboard, /homeFunnelReview\.added/);
});

test('首页使用横向公司招聘漏斗和渠道进度列表', () => {
  const dashboard = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.match(dashboard, /wb-home-company-funnel-grid/);
  assert.match(dashboard, /wb-home-pipeline/);
  assert.match(dashboard, /v-for="\(stage, index\) in homeFunnelStageSummary"/);
  assert.match(dashboard, /homeFunnelBusinessMetrics\.overallRate/);
  assert.match(dashboard, /homeFunnelChannelRows/);
  assert.match(dashboard, /openHomeFunnelCandidates\(stage\)/);
  assert.match(dashboard, /openHomeFunnelChannelDetails\(channel\)/);
  assert.match(dashboard, /openHomeFunnelChannelImport\(channel\)/);
  assert.doesNotMatch(dashboard, /wb-home-stage-row/);
});

test('今日待办与今日复盘使用紧凑两栏工作区', () => {
  const dashboard = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.match(dashboard, /wb-home-execution-grid/);
  assert.match(dashboard, /homeTodoTabs/);
  assert.match(dashboard, /filteredHomeTodos/);
  assert.match(dashboard, /wb-home-todo-status/);
  assert.match(dashboard, /homeFunnelAiSummary/);
  assert.match(dashboard, /AI 智能总结/);
  assert.match(dashboard, /v-model="homeReviewNotes\.issue"/);
  assert.match(dashboard, /v-model="homeReviewNotes\.tomorrow"/);
});

test('工作台首页不再展示旧的 KPI 卡片和业务进展大卡片', () => {
  const dashboard = INDEX_HTML.match(/workbenchNav === 'dashboard' && workbenchRoute\.type === 'list'[\s\S]*?<div v-else-if="workbenchNav === 'companies'/)?.[0] || '';
  assert.match(dashboard, /wb-home-section/);
  assert.match(INDEX_HTML, /\.wb-home-dashboard > \.wb-v2-metric-grid[\s\S]*?display:\s*none/);
  assert.match(INDEX_HTML, /\.wb-home-dashboard > \.wb-v2-dashboard-grid[\s\S]*?display:\s*none/);
});

function analyticsFor(companyId, inputEvents = events) {
  return buildTalentFunnelAnalytics({
    events: inputEvents,
    channels,
    companyId,
    baselineAt: '2026-08-11T00:00:00.000Z',
  });
}

test('只为选中公司加载事件，并只把该 companyId 传给 analytics', async () => {
  const state = {};
  const eventCompanyIds = [];
  const analyticsArguments = [];
  const controller = createTalentFunnelDashboardController({
    state,
    getChannels: async () => channels,
    getEventsByCompany: async companyId => {
      eventCompanyIds.push(companyId);
      return events.filter(event => event.companyId === companyId);
    },
    getScope: () => ({ baselineAt: '2026-08-11T00:00:00.000Z' }),
    analytics: {
      buildTalentFunnelAnalytics(input) {
        analyticsArguments.push(input);
        return analyticsFor(input.companyId, input.events);
      },
    },
  });

  await controller.loadCompany('company-a');

  assert.deepEqual(eventCompanyIds, ['company-a']);
  assert.equal(analyticsArguments[0].companyId, 'company-a');
  assert.deepEqual(analyticsArguments[0].events.map(event => event.companyId), ['company-a', 'company-a', 'company-a']);
  assert.equal(state.model.channels[0].stages[0].count, 1);
  assert.equal(state.model.channels[1].stages[0].count, 0);
});

test('看板模型固定为渠道漏斗、卡点诊断、结论建议三段', () => {
  const model = buildTalentFunnelDashboardModel({
    companyId: 'company-a',
    companyName: '甲公司',
    analytics: analyticsFor('company-a'),
  });

  assert.deepEqual(SECTION_ORDER, ['funnel', 'bottlenecks', 'recommendations']);
  assert.deepEqual(model.sectionOrder, SECTION_ORDER);
  assert.equal(model.bottlenecks[0].stageLabel, '已匹配');
  assert.match(model.recommendations[0].text, /薪资不匹配|salary_mismatch/);
  assert.equal(model.aiSlot.status, 'reserved');
});

test('渠道模型来自动态渠道字典，不硬编码渠道名称', () => {
  const dynamicChannels = [{ id: 'new_channel', name: '新渠道名称' }];
  const model = buildTalentFunnelDashboardModel({
    companyId: 'company-a',
    analytics: {
      channels: [{
        channelId: 'new_channel',
        channelName: '新渠道名称',
        counts: { imported: 2, contacted: 1, matched: 0, interviewed: 0, offered: 0, hired: 0 },
        adjacentRates: { importedToContacted: 0.5 },
        cumulativeRates: { importedToContacted: 0.5, importedToHired: 0.2 },
      }],
      bottlenecks: [],
    },
    channels: dynamicChannels,
  });

  assert.deepEqual(model.channels.map(channel => channel.channelName), ['新渠道名称']);
  assert.equal(model.channels[0].stages[0].count, 2);
  assert.equal(model.channels[0].stages[1].adjacentRate, 0.5);
  assert.equal(model.channels[0].conversionRate, 0.2);
});

test('没有事件时显示明确空态', () => {
  const model = buildTalentFunnelDashboardModel({
    companyId: 'company-a',
    analytics: analyticsFor('company-a', []),
  });

  assert.equal(model.hasData, false);
  assert.match(model.emptyMessage, /暂无.*漏斗/);
  assert.equal(model.channels.length, channels.length);
  assert.equal(model.bottlenecks.length, 0);
});

test('切换公司会立即清空旧模型，并忽略旧公司的过期响应', async () => {
  const pending = new Map();
  const state = {};
  const controller = createTalentFunnelDashboardController({
    state,
    getChannels: async () => channels,
    getEventsByCompany: companyId => new Promise(resolve => pending.set(companyId, resolve)),
    getScope: () => ({ baselineAt: '2026-08-11T00:00:00.000Z' }),
    analytics: { buildTalentFunnelAnalytics: input => analyticsFor(input.companyId, input.events) },
  });

  const companyA = controller.loadCompany('company-a');
  await Promise.resolve();
  const companyB = controller.loadCompany('company-b');
  assert.equal(state.companyId, 'company-b');
  assert.deepEqual(state.model.channels, []);

  pending.get('company-b')([events[3]]);
  await companyB;
  assert.equal(state.companyId, 'company-b');
  assert.equal(state.model.channels[1].stages[0].count, 1);

  pending.get('company-a')([events[0]]);
  await companyA;
  assert.equal(state.companyId, 'company-b');
  assert.equal(state.model.channels[1].stages[0].count, 1);
});
