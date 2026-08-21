import test from 'node:test';
import assert from 'node:assert/strict';
import { createLegacyJobParseActions, fallbackParseJobText } from './legacy-job-parse-actions.js';

test('fallback parser extracts company, position, location and preserves detail', () => {
  const result = fallbackParseJobText('贝壳招聘高级产品经理，北京，负责招聘平台建设');
  assert.equal(result.company, '贝壳');
  assert.equal(result.positionName, '高级产品经理');
  assert.equal(result.location, '北京');
  assert.match(result.detail, /招聘平台建设/);
});

test('OCR 成功但 AI 失败时保留原文并进入可识别的 fallback 状态', async () => {
  const previousWindow = globalThis.window;
  const recognizedText = '岗位：高级产品经理\n工作地点：北京\n负责招聘平台建设与团队协作';
  const state = {
    image: { value: '' }, status: { value: '' }, error: { value: '' },
  };
  let applied = null;
  const notices = [];
  globalThis.window = {
    Tesseract: { recognize: async () => ({ data: { text: recognizedText } }) },
  };
  try {
    const actions = createLegacyJobParseActions({
      form: { positions: [{ name: '', detail: '', location: '' }] },
      textParseRaw: { value: '' }, textParseStatus: { value: '' }, textParseError: { value: '' },
      ocrImage: state.image, ocrStatus: state.status, ocrError: state.error,
      ensureTesseractDependency: async () => {},
      extractJobInfoWithDeepSeek: async () => { throw new Error('AI unavailable'); },
      applyStructured: structured => { applied = structured; return Boolean(structured?.detail); },
      showToast: message => notices.push(message),
    });
    await actions.processOcrImage(new Blob(['image'], { type: 'image/png' }));
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
  assert.equal(state.status.value, 'fallback');
  assert.equal(state.error.value, '文字已识别，AI 自动填写失败');
  assert.equal(applied.detail, recognizedText);
  assert.deepEqual(notices, ['文字已识别，AI 自动填写失败']);
});

test('fallback parser extracts liepin-style salary and recruiter company', () => {
  const result = fallbackParseJobText('平台运营经理23-30k·13薪\n深圳-光明区\n招聘经理 · 深圳市羲和生命科技有限责任公司');
  assert.equal(result.positionName, '平台运营经理');
  assert.equal(result.salary, '23-30k·13薪');
  assert.equal(result.company, '深圳市羲和生命科技有限责任公司');
});
