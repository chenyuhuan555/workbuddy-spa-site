import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

const source = readFileSync(new URL('./guest-demo-ai.js', import.meta.url), 'utf8');

function loadModule() {
  const root = {};
  const context = { globalThis: root, setTimeout, Promise };
  vm.runInNewContext(source, context, { filename: 'guest-demo-ai.js' });
  return { api: root.WorkBuddyGuestDemoAi, root };
}

test('guest AI returns deterministic fictional text without a network implementation', async () => {
  const { api } = loadModule();
  const call = api.createMockCall({ delay: 0 });

  const first = await call({ task: 'client-candidate-report', schema: 'text', messages: [{ role: 'user', content: 'secret' }] });
  const second = await call({ task: 'client-candidate-report', schema: 'text', messages: [{ role: 'user', content: 'different' }] });
  assert.equal(first, second);
  assert.match(first, /^【模拟结果】/);
  assert.doesNotMatch(source, /\bfetch\s*\(|supabase|api\.deepseek/i);
});

test('guest AI supplies usable fictional JSON for resume and job analysis', async () => {
  const { api } = loadModule();
  const call = api.createMockCall({ delay: 0 });

  const candidate = await call({ task: 'candidate-basic-info', schema: 'json' });
  assert.equal(candidate.name, '林晓');
  assert.ok(Array.isArray(candidate.skills));

  const job = await call({ task: 'job-keywords', schema: 'json' });
  assert.ok(Array.isArray(job.skills));
  assert.ok(job.skills.length >= 3);
});

test('guest AI supplies fictional arrays for target company research', async () => {
  const { api } = loadModule();
  const call = api.createMockCall({ delay: 0 });
  const results = await call({ task: 'target-company-research', schema: 'array' });

  assert.ok(Array.isArray(results));
  assert.ok(results.length >= 2);
  assert.ok(results.every(item => !/[（(](?:演示|虚构)[）)]/u.test(item.name)));
});

test('mock streaming reports local progress and install replaces AI and gateway entry points', async () => {
  const { api, root } = loadModule();
  const progress = [];
  root.WorkBuddyAI = { callDeepSeek: () => 'real' };
  root.WorkBuddyAiGateway = { createAiGateway: () => ({}) };

  const mock = api.install(root, { delay: 0 });
  const result = await root.callDeepSeek({
    task: 'default',
    schema: 'text',
    stream: true,
    onProgress: (chunk, full) => progress.push([chunk, full]),
  });

  assert.equal(result, mock.responses.text.default);
  assert.equal(root.WorkBuddyAI.callDeepSeek, root.callDeepSeek);
  assert.ok(progress.length >= 1);
  const gateway = root.WorkBuddyAiGateway.createAiGateway();
  assert.equal((await gateway.parseResume({})).name, '林晓');
  assert.ok(Array.isArray(await gateway.matchCandidates({})));
});

test('guest AI uses the visitor key for real calls and falls back to local results without one', async () => {
  const { api, root } = loadModule();
  const calls = [];
  root.WorkBuddyAI = { callDeepSeek: async options => { calls.push(options); return 'real result'; } };
  const installed = api.install(root, { delay: 0 });
  assert.match(await root.callDeepSeek({ task: 'default', messages: [{ role: 'user', content: 'x' }], getApiKey: () => 'sk-visitor-key' }), /real result/);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].apiKey, 'sk-visitor-key');
  assert.match(await root.callDeepSeek({ task: 'default', messages: [{ role: 'user', content: 'x' }] }), /^【模拟结果】/);
  assert.equal(installed.responses.text.default.startsWith('【模拟结果】'), true);
});
