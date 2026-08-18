import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
await import('./talent-search-messages.js');
const { errorMessage } = globalThis.WorkBuddyTalentSearchMessages;

test('云端搜索错误映射为可操作提示', () => {
  assert.match(errorMessage({ code: 'AUTH_REQUIRED' }), /先登录/);
  assert.match(errorMessage({ code: 'RPC_NOT_DEPLOYED' }), /search_resumes RPC/);
  assert.match(errorMessage({ code: 'BACKEND_REQUEST_FAILED' }), /保留本地人才列表/);
});
