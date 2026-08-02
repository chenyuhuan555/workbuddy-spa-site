import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./ai-gateway.js');
const { createAiGateway } = globalThis.WorkBuddyAiGateway;

test('AI 网关通过 Supabase Function 调用，不接受前端 API Key', async () => {
  const calls = [];
  const gateway = createAiGateway({ supabase: { functions: { invoke: async (...args) => { calls.push(args); return { data: { ok: true }, error: null }; } } } });
  const result = await gateway.parseResume({ rawText: '简历文本' });
  assert.deepEqual(result, { ok: true });
  assert.deepEqual(calls[0][0], 'parse-resume');
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0][1].body, 'apiKey'), false);
});
