import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiNoteActions } from './ai-note-actions.js';

test('saves an AI note to the selected entity', async () => {
  const target = { id: 'candidate-1' };
  const toasts = [];
  const actions = createAiNoteActions({
    getTarget: () => target,
    save: async () => true,
    showToast: message => toasts.push(message),
    now: () => '2026-08-04T00:00:00.000Z',
    random: () => 'abcde',
  });
  const draft = { targetType: 'candidate', targetId: 'candidate-1', title: '结论', open: true };
  assert.equal(await actions.saveAnalysis({ draft, output: '内容', tool: { key: 'tool', title: 'AI工具' } }), true);
  assert.match(target.aiNotes[0].id, /^note_[a-z0-9]+_abcde$/);
  assert.equal(draft.open, false);
  assert.deepEqual(toasts, ['已保存到候选人AI分析']);
});

test('rejects missing output and removes an existing note', async () => {
  const target = { id: 'company-1', aiNotes: [{ id: 'note-1' }] };
  let saves = 0;
  const actions = createAiNoteActions({ getTarget: () => target, save: async () => { saves += 1; return true; } });
  const draft = { targetType: 'company', targetId: 'company-1', error: '' };
  assert.equal(await actions.saveAnalysis({ draft, output: '' }), false);
  assert.equal(draft.error, '没有可保存的内容');
  assert.equal(await actions.deleteNote('company', 'company-1', 'note-1'), true);
  assert.equal(target.aiNotes.length, 0);
  assert.equal(saves, 1);
});

test('extracts a readable summary from markdown', () => {
  const actions = createAiNoteActions({ getTarget: () => null });
  assert.equal(actions.extractSummary('## 核心结论\n\n- 推荐进入复试\n\n## 风险\n内容'), '推荐进入复试');
});
