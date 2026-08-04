import test from 'node:test';
import assert from 'node:assert/strict';
import { createTimelineAiActions } from './timeline-ai-actions.js';

test('generates timeline motivation analysis and persists it', async () => {
  const state = { loadingKey: '', output: '', label: '', error: '' };
  const saved = [];
  const actions = createTimelineAiActions({ getResume: () => ({ id: 'r1' }), state, getEntries: () => [{ type: 'work', name: '公司A', role: '顾问', period: '2024', duration: 12 }], callAi: async request => { assert.equal(request.task, 'timeline-motivation'); return '分析结果'; }, persist: (...args) => saved.push(args) });
  assert.equal(await actions.generateMotivationAnalysis(), true);
  assert.equal(state.output, '分析结果');
  assert.equal(saved[0][0], 'motivationAnalysis');
});

test('reports AI errors and resets loading state', async () => {
  const state = { loadingKey: '', output: '', label: '', error: '' };
  const actions = createTimelineAiActions({ getResume: () => ({ id: 'r1' }), state, callAi: async () => { throw new Error('网络失败'); } });
  assert.equal(await actions.generateOpeningScript(), false);
  assert.equal(state.error, '网络失败');
  assert.equal(state.loadingKey, '');
});
