import test from 'node:test';
import assert from 'node:assert/strict';
globalThis.window = globalThis;
await import('./talent-funnel-ai.js');
const { createTalentFunnelAiService, buildTalentFunnelDiagnosisMessages } = globalThis.WorkBuddyTalentFunnelAi;

test('AI prompt only receives company-scoped analytics facts', () => {
  const messages = buildTalentFunnelDiagnosisMessages({ companyName: '量子公司', analytics: { channels: [{ channelId: 'website', channelName: '外宣网站', counts: { imported: 3 } }], bottlenecks: [] } });
  assert.match(messages[1].content, /量子公司/);
  assert.match(messages[1].content, /外宣网站/);
  assert.doesNotMatch(messages[1].content, /全部公司|总漏斗/);
});

test('AI service requests structured advice and normalizes the result', async () => {
  const calls = [];
  const service = createTalentFunnelAiService({ invoke: async options => { calls.push(options); return { summary: '样本显示触达阶段需要优化。', suggestions: ['  建立 24 小时首次触达 SLA  ', '', '扩大有效渠道'] }; }, getApiKey: () => 'key' });
  const result = await service.analyze({ companyName: '量子公司', analytics: { channels: [], bottlenecks: [] } });
  assert.equal(calls[0].task, 'talent-funnel-diagnosis');
  assert.equal(calls[0].schema, 'json');
  assert.equal(calls[0].getApiKey(), 'key');
  assert.deepEqual(result, { summary: '样本显示触达阶段需要优化。', suggestions: ['建立 24 小时首次触达 SLA', '扩大有效渠道'] });
});
