import test from 'node:test';
import assert from 'node:assert/strict';
import { createApplicationMatchAnalysisActions } from './application-match-analysis-actions.js';

const context = () => ({
  application: { id: 'app-1', candidateId: 'cand-1', positionId: 'pos-1', aiMatchAnalysis: { score: 40, conclusion: '旧结果' } },
  candidate: { id: 'cand-1', name: '候选人', electronicResumeText: 'Java 后端开发，5 年经验' },
  position: { id: 'pos-1', title: '后端工程师', description: '负责 Java 服务开发', skills: ['Java', 'Spring'] },
});

test('generates, normalizes and saves an application match analysis', async () => {
  let saved = 0;
  const state = context();
  const actions = createApplicationMatchAnalysisActions({ getContext: () => state, callAi: async () => JSON.stringify({ score: 108, conclusion: '强匹配', strengths: ['Java'], risks: '需确认薪资', verifyQuestions: ['期望薪资？'], recommendation: '建议推进' }), save: async () => { saved += 1; return true; }, now: () => '2026-08-04T00:00:00.000Z' });
  const result = await actions.analyze();
  assert.equal(result.ok, true);
  assert.equal(result.analysis.score, 100);
  assert.deepEqual(result.analysis.risks, ['需确认薪资']);
  assert.equal(state.application.aiMatchAnalysis.score, 100);
  assert.equal(state.application.matchScore, 100);
  assert.equal(saved, 1);
});

test('rejects incomplete input without calling AI', async () => {
  let calls = 0;
  const actions = createApplicationMatchAnalysisActions({ getContext: () => ({ application: {}, candidate: {}, position: {} }), callAi: async () => { calls += 1; } });
  const result = await actions.analyze();
  assert.equal(result.ok, false);
  assert.match(result.error, /岗位信息|简历/);
  assert.equal(calls, 0);
});

test('keeps old result when AI or persistence fails', async () => {
  const state = context();
  const actions = createApplicationMatchAnalysisActions({ getContext: () => state, callAi: async () => 'not-json', save: async () => false });
  const result = await actions.analyze();
  assert.equal(result.ok, false);
  assert.equal(state.application.aiMatchAnalysis.score, 40);
});

test('blocks duplicate analysis while a request is running', async () => {
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  const actions = createApplicationMatchAnalysisActions({ getContext: context, callAi: async () => { await pending; return '{}'; } });
  const first = actions.analyze();
  const second = await actions.analyze();
  assert.equal(second.error, '分析正在进行中');
  release();
  await first;
});
