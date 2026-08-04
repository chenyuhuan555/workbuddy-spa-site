import test from 'node:test';
import assert from 'node:assert/strict';
import { createInlineAiAnalysisActions } from './inline-ai-analysis-actions.js';

test('saves inline AI output to the selected entity and clears the panel', async () => {
  const target = { id: 'c1', aiNotes: [] };
  const panel = { output: '结论', input: '上下文', toolKey: 'screening' };
  const messages = [];
  const actions = createInlineAiAnalysisActions({
    findTarget: () => target,
    ensureAiNotes: entity => { entity.aiNotes ||= []; },
    findTool: () => ({ title: '筛选分析' }),
    save: async () => true,
    now: () => new Date('2026-08-04T10:20:00.000Z'),
    showToast: (...args) => messages.push(args),
  });
  await actions.saveInlineAiAnalysis(panel, 'candidate', 'c1');
  assert.equal(target.aiNotes.length, 1);
  assert.equal(target.aiNotes[0].title, '筛选分析 - 2026-08-04 18:20');
  assert.equal(panel.output, '');
  assert.deepEqual(messages.at(-1), ['已保存到候选人AI分析']);
});

test('does not clear output when persistence fails or target is missing', async () => {
  const panel = { output: '结论', input: '上下文', toolKey: '' };
  const messages = [];
  const actions = createInlineAiAnalysisActions({ findTarget: () => null, showToast: (...args) => messages.push(args) });
  await actions.saveInlineAiAnalysis(panel, 'company', 'missing');
  assert.equal(panel.output, '结论');
  assert.deepEqual(messages.at(-1), ['保存目标不存在', 'error']);
});
