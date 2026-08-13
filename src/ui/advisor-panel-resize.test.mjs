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

test('顾问助手是每个账号独立的可选功能，默认关闭并可从设置开启', () => {
  assert.match(html, /data-settings-card="advisor"/);
  assert.match(html, /顾问助手开关/);
  assert.match(html, /v-model="advisorPanel\.enabled"/);
  assert.match(html, /@change="setAdvisorEnabled\(advisorPanel\.enabled\)"/);
  assert.match(html, /const ADVISOR_ENABLED_KEY = STORAGE_KEY \+ '_recruiter_copilot_enabled'/);
  assert.match(html, /advisorPanel\.enabled = localStorage\.getItem\(getAdvisorEnabledKey\(\)\) === 'true'/);
  assert.match(html, /function setAdvisorEnabled\(enabled\)[\s\S]*?advisorPanel\.open = false/);
  assert.match(html, /v-if="advisorPanel\.enabled && !advisorPanel\.meetingArticle && !advisorPanel\.hidden"/);
});

test('人才库标题不再显示增强版工作表宣传语', () => {
  assert.doesNotMatch(html, /增强版人才工作表 · 快速浏览、比较和推进/);
});
