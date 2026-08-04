import test from 'node:test';
import assert from 'node:assert/strict';
import { createOcrInputActions } from './ocr-input-actions.js';

function setup() {
  const calls = [];
  const state = {
    image: { value: 'old' }, dragging: { value: true }, status: { value: 'busy' }, error: { value: 'error' },
    input: { value: { click: () => calls.push('click') } },
  };
  const actions = createOcrInputActions({ state, processImage: file => calls.push(file) });
  return { actions, state, calls };
}

test('clears OCR state and triggers the hidden input', () => {
  const { actions, state, calls } = setup();
  actions.clear(); actions.triggerInput();
  assert.deepEqual([state.image.value, state.status.value, state.error.value], ['', '', '']);
  assert.deepEqual(calls, ['click']);
});

test('accepts images from paste, drop and file change', async () => {
  const { actions, state, calls } = setup();
  const image = { type: 'image/png' };
  const file = { type: 'image/jpeg' };
  await actions.paste({ clipboardData: { items: [{ type: 'text/plain' }, { type: 'image/png', getAsFile: () => image }] } });
  await actions.drop({ dataTransfer: { files: [file] } });
  await actions.change({ target: { files: [image], value: 'selected' } });
  assert.deepEqual(calls, [image, file, image]);
  assert.equal(state.dragging.value, false);
});
