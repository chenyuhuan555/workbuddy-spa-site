import test from 'node:test';
import assert from 'node:assert/strict';
import { createCandidatePipelineActions } from './candidate-pipeline-actions.js';

test('records a follow-up and persists only the changed resume', () => {
  const resume = { pipelineStage: 'contacted', followups: [], followupDraft: '已电话沟通' };
  let saves = 0;
  const actions = createCandidatePipelineActions({ dialog: {}, modal: {}, ensureDefaults: () => {}, pipeline: {}, candidatePipelineLabel: stage => stage, localSave: () => { saves += 1; }, currentTime: () => '2026-08-03T00:00:00.000Z' });
  actions.recordFollowup(resume);
  assert.equal(resume.followups[0].note, '已电话沟通');
  assert.equal(saves, 1);
});

test('stage change writes an event and closes the dialog', () => {
  const resume = { pipelineStage: 'contacted' };
  const dialog = { resume, toStage: 'interview', occurredAt: '2026-08-03', reasonCode: '', reasonNote: '', show: true };
  let event;
  const actions = createCandidatePipelineActions({ dialog, modal: { assigneeName: '顾问' }, ensureDefaults: () => {}, pipeline: { appendStageEvent: (target, value) => { event = [target, value]; target.pipelineStage = value.toStage; } }, candidatePipelineLabel: stage => stage, currentTime: () => '2026-08-03T00:00:00.000Z' });
  actions.saveStageChange();
  assert.equal(event[1].toStage, 'interview');
  assert.equal(dialog.show, false);
});
