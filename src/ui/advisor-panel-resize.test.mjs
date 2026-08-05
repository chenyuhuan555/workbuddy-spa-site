import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');

test('顾问助手侧栏支持指针拖拽调整宽度并持久化', () => {
  assert.match(html, /class="advisor-resize-handle[^\n]*"[\s\S]*?@pointerdown="startAdvisorResize"/);
  assert.match(html, /function startAdvisorResize\(e\)[\s\S]*?document\.addEventListener\('pointermove', moveAdvisorResize\)/);
  assert.match(html, /function moveAdvisorResize\(e\)[\s\S]*?advisorPanel\.width = Math\.max\(360/);
  assert.match(html, /function endAdvisorResize\(\)[\s\S]*?saveAdvisorPanelWidth\(\)/);
  assert.match(html, /const ADVISOR_PANEL_WIDTH_KEY = STORAGE_KEY \+ '_recruiter_copilot_width'/);
});
