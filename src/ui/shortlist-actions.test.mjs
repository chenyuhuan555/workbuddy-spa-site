import test from 'node:test';
import assert from 'node:assert/strict';
import { createShortlistActions } from './shortlist-actions.js';

test('builds a copyable shortlist summary with score, stage and risk', async () => {
  const writes = [];
  const actions = createShortlistActions({
    dialog: { job: { company: '公司A' }, pos: { name: '岗位A' } },
    getCandidates: () => [{ name: '候选人A', aiScore: { score: 90, risks: '需确认' }, pipelineStage: 'screening', nextFollowupAt: '2026-08-05' }],
    pipelineLabel: () => '筛选中', clipboard: { writeText: async value => writes.push(value) }, showToast: () => {},
  });
  await actions.copySummary();
  assert.match(writes[0], /岗位短名单：公司A · 岗位A/);
  assert.match(writes[0], /评分：90/);
  assert.match(writes[0], /阶段：筛选中/);
  assert.match(writes[0], /风险：需确认/);
});

test('returns a fallback summary for sparse candidates', () => {
  const actions = createShortlistActions({ dialog: {}, getCandidates: () => [] });
  assert.equal(actions.candidateSummary({}), '未命名候选人');
});
