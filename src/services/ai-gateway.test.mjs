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

test('每日复盘总结通过 AI 网关生成纯文本，不向前端暴露 API Key', async () => {
  const calls = [];
  const supabase = {
    functions: {
      invoke: async (...args) => {
        calls.push(args);
        return {
          data: { choices: [{ message: { content: '今日完成重点候选人推进。' } }] },
          error: null,
        };
      },
    },
  };
  const gateway = createAiGateway({ supabase });
  const result = await gateway.summarizeDailyReview({
    reviewDate: '2026-08-20',
    userName: '顾问A',
    metrics: { addedCandidates: 2, recommendations: 1 },
    issue: '客户反馈较慢',
    tomorrowFocus: '跟进面试反馈',
  });

  assert.equal(result, '今日完成重点候选人推进。');
  assert.equal(calls[0][0], 'parse-resume');
  assert.equal(calls[0][1].body.task, 'daily_review_summary');
  assert.ok(Array.isArray(calls[0][1].body.messages));
  assert.equal(Object.prototype.hasOwnProperty.call(calls[0][1].body, 'apiKey'), false);
});
