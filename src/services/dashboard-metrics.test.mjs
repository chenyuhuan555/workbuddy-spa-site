import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./dashboard-metrics.js');
const { buildDashboardMetrics } = globalThis.WorkBuddyDashboardMetrics;

test('仪表盘业务指标按状态和推进阶段统计', () => {
  assert.deepEqual(buildDashboardMetrics({
    companies: [{ status: 'active' }, { status: 'paused' }],
    positions: [{ status: 'open' }, { status: 'closed' }],
    candidates: [{ id: 'c1' }],
    applications: [{ stage: 'interview' }, { stage: 'offer' }, { stage: 'closed' }],
  }, { closedStage: 'closed', interviewStages: ['interview'], offerStages: ['offer'] }), {
    companies: 1, positions: 1, candidates: 1, applications: 2, interviews: 1, offers: 1,
  });
});
