import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
await import('./talent-funnel-stage-actions.js');
const { createTalentFunnelStageActions } = globalThis.WorkBuddyTalentFunnelStageActions;

function createFixture(overrides = {}) {
  const applied = [];
  const appended = [];
  const repo = overrides.repo === null ? null : {
    async appendEvent(event) {
      appended.push(event);
      if (overrides.appendError) throw overrides.appendError;
      return event;
    },
    async listEventsByCompany() {
      return overrides.existingEvents || [];
    },
    async listEventsByCompanyAndChannel() {
      return overrides.existingEvents || [];
    },
  };
  const actions = createTalentFunnelStageActions({
    getEventRepo: () => repo,
    getScope: () => overrides.scope || { companyIds: ['co_quantum_1'], baselineAt: '2026-08-11T00:00:00.000Z' },
    applyStageChange: (application, payload) => {
      applied.push({ application, payload });
      application.stage = payload.toStage;
      application.stageEnteredAt = payload.occurredAt || '2026-08-12T09:00:00.000Z';
      application.updatedAt = payload.occurredAt || '2026-08-12T09:00:00.000Z';
      return { id: 'local_evt_1' };
    },
    now: overrides.now || (() => '2026-08-12T09:00:00.000Z'),
  });
  return { actions, applied, appended };
}

test('阶段白名单外的值被拒绝', async () => {
  const { actions } = createFixture();
  await assert.rejects(
    () => actions.changeStage({ id: 'app_1', companyId: 'co_quantum_1', stage: 'contacted' }, { toStage: 'unknown_stage', manualConfirmed: true }),
    error => error.code === 'FUNNEL_STAGE_INVALID',
  );
});

test('匹配成功必须人工确认', async () => {
  const { actions } = createFixture();
  await assert.rejects(
    () => actions.changeStage({ id: 'app_1', companyId: 'co_quantum_1', stage: 'contacted' }, { toStage: 'screening' }),
    error => error.code === 'FUNNEL_MATCH_CONFIRM_REQUIRED',
  );
});

test('阶段失败必须填写 reason_code，reason_code=other 必须填写备注', async () => {
  const { actions } = createFixture();
  const application = { id: 'app_1', companyId: 'co_quantum_1', stage: 'interviewing' };

  await assert.rejects(
    () => actions.changeStage(application, { toStage: 'closed' }),
    error => error.code === 'FUNNEL_REASON_REQUIRED',
  );
  await assert.rejects(
    () => actions.changeStage(application, { toStage: 'closed', reasonCode: 'other' }),
    error => error.code === 'FUNNEL_REASON_NOTE_REQUIRED',
  );
});

test('试点公司且命中基线时，阶段推进先追加事件再更新 application', async () => {
  const { actions, applied, appended } = createFixture();
  const application = {
    id: 'app_1',
    companyId: 'co_quantum_1',
    positionId: 'pos_1',
    candidateId: 'cand_1',
    stage: 'contacted',
  };

  const result = await actions.changeStage(application, {
    toStage: 'screening',
    manualConfirmed: true,
    occurredAt: '2026-08-12T09:00:00.000Z',
    channelId: 'channel_referral',
  });

  assert.equal(result.ok, true);
  assert.equal(result.eventAppended, true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].stage, 'matched');
  assert.equal(appended[0].result, 'success');
  assert.equal(appended[0].channelId, 'channel_referral');
  assert.equal(applied.length, 1);
  assert.equal(application.stage, 'screening');
});

test('同一次 changeStage 只计算一次 occurredAt，事件时间与 application 更新时间一致', async () => {
  let nowCalls = 0;
  const { actions, applied, appended } = createFixture({
    now: () => {
      nowCalls += 1;
      return '2026-08-12T11:00:00.000Z';
    },
  });
  const application = { id: 'app_1', companyId: 'co_quantum_1', stage: 'discovered' };

  await actions.changeStage(application, { toStage: 'contacted' });

  assert.equal(nowCalls, 1);
  assert.equal(appended[0].occurredAt, '2026-08-12T11:00:00.000Z');
  assert.equal(applied[0].payload.occurredAt, '2026-08-12T11:00:00.000Z');
  assert.equal(application.updatedAt, '2026-08-12T11:00:00.000Z');
});

test('历史为空时，即使当前 application 已在同一 canonical stage，也要补首个合法 success 事件', async () => {
  const { actions, applied, appended } = createFixture();
  const application = { id: 'app_1', companyId: 'co_quantum_1', stage: 'screening' };

  const result = await actions.changeStage(application, {
    toStage: 'recommended',
    manualConfirmed: true,
    occurredAt: '2026-08-12T10:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.eventAppended, true);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].stage, 'matched');
  assert.equal(applied.length, 1);
  assert.equal(application.stage, 'recommended');
});

test('只有已有同 applicationId + canonical stage 的 success 历史事件时才去重', async () => {
  const { actions, applied, appended } = createFixture({
    existingEvents: [{
      applicationId: 'app_1',
      stage: 'matched',
      result: 'success',
    }],
  });
  const application = { id: 'app_1', companyId: 'co_quantum_1', stage: 'screening' };

  const result = await actions.changeStage(application, {
    toStage: 'recommended',
    manualConfirmed: true,
    occurredAt: '2026-08-12T10:00:00.000Z',
  });

  assert.equal(result.ok, true);
  assert.equal(result.eventAppended, false);
  assert.equal(appended.length, 0);
  assert.equal(applied.length, 1);
  assert.equal(application.stage, 'recommended');
});

test('不在试点或早于 baselineAt 时，不回填事件但仍保留 application 更新', async () => {
  const offPilot = createFixture({ scope: { companyIds: ['co_other'], baselineAt: '2026-08-11T00:00:00.000Z' } });
  const early = createFixture();

  await offPilot.actions.changeStage({ id: 'app_1', companyId: 'co_quantum_1', stage: 'discovered' }, { toStage: 'contacted' });
  await early.actions.changeStage({ id: 'app_2', companyId: 'co_quantum_1', stage: 'discovered' }, { toStage: 'contacted', occurredAt: '2026-08-10T23:00:00.000Z' });

  assert.equal(offPilot.appended.length, 0);
  assert.equal(offPilot.applied.length, 1);
  assert.equal(early.appended.length, 0);
  assert.equal(early.applied.length, 1);
});

test('事件写入失败返回明确错误码，且不伪装为推进成功', async () => {
  const { actions, applied } = createFixture({
    appendError: Object.assign(new Error('db down'), { code: 'BACKEND_REQUEST_FAILED' }),
  });

  await assert.rejects(
    () => actions.changeStage({ id: 'app_1', companyId: 'co_quantum_1', stage: 'discovered' }, { toStage: 'contacted' }),
    error => error.code === 'FUNNEL_EVENT_WRITE_FAILED',
  );
  assert.equal(applied.length, 0);
});

test('index.html 按顺序加载 talent funnel repo、scope、stage action 和现有入口 action', () => {
  const indexHtml = fs.readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
  const repoPos = indexHtml.indexOf('./src/services/repo/talent-funnel-event-repo.js');
  const scopePos = indexHtml.indexOf('./src/services/talent-funnel-scope.js');
  const stageActionPos = indexHtml.indexOf('./src/ui/talent-funnel-stage-actions.js');
  const entryActionPos = indexHtml.indexOf('./src/ui/workbench-application-actions.js');

  assert.ok(repoPos >= 0, '应加载 talent-funnel-event-repo.js');
  assert.ok(scopePos >= 0, '应加载 talent-funnel-scope.js');
  assert.ok(stageActionPos >= 0, '应加载 talent-funnel-stage-actions.js');
  assert.ok(entryActionPos >= 0, '应继续加载现有 workbench-application-actions.js');
  assert.ok(repoPos < scopePos && scopePos < stageActionPos && stageActionPos < entryActionPos, '新模块应在现有入口前按依赖顺序加载');
});

test('package.json 的测试脚本包含 talent funnel stage actions 与 scope 测试', () => {
  const pkg = fs.readFileSync(new URL('../../package.json', import.meta.url), 'utf8');
  assert.match(pkg, /src\/ui\/talent-funnel-stage-actions\.test\.mjs/);
  assert.match(pkg, /src\/services\/talent-funnel-scope\.test\.mjs/);
});
